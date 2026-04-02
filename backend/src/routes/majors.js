const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getEventField, getEventResults, getUpcomingEvents } = require('../services/espn');
const { generateSnakeOrder } = require('../services/draft');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/majors
router.get('/', authenticate, async (req, res) => {
  const majors = await prisma.major.findMany({
    orderBy: { startDate: 'asc' },
    include: {
      _count: { select: { picks: true, playerFields: true } },
    },
  });
  res.json(majors);
});

// GET /api/majors/:id
router.get('/:id', authenticate, async (req, res) => {
  const major = await prisma.major.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { picks: true, playerFields: true } },
    },
  });
  if (!major) return res.status(404).json({ error: 'Major not found' });
  res.json(major);
});

// POST /api/majors (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, year, startDate, endDate, espnEventId } = req.body;
  if (!name || !year || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, year, startDate, endDate required' });
  }
  const major = await prisma.major.create({
    data: {
      name,
      year: parseInt(year),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      espnEventId: espnEventId || null,
    },
  });
  res.status(201).json(major);
});

// PATCH /api/majors/:id (admin) — update espnEventId or dates
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { espnEventId, startDate, endDate, name } = req.body;
  const data = {};
  if (espnEventId !== undefined) data.espnEventId = espnEventId;
  if (startDate) data.startDate = new Date(startDate);
  if (endDate) data.endDate = new Date(endDate);
  if (name) data.name = name;

  const major = await prisma.major.update({ where: { id: req.params.id }, data });
  res.json(major);
});

// POST /api/majors/:id/sync-field (admin)
router.post('/:id/sync-field', authenticate, requireAdmin, async (req, res) => {
  const major = await prisma.major.findUnique({ where: { id: req.params.id } });
  if (!major) return res.status(404).json({ error: 'Major not found' });
  if (!major.espnEventId) return res.status(400).json({ error: 'Set espnEventId first' });

  let players;
  try {
    players = await getEventField(major.espnEventId);
  } catch (err) {
    return res.status(502).json({ error: `ESPN fetch failed: ${err.message}` });
  }

  let added = 0;
  for (const p of players) {
    // Upsert player
    const player = await prisma.player.upsert({
      where: { espnId: p.espnId },
      update: { name: p.name, worldRanking: p.worldRanking },
      create: { name: p.name, espnId: p.espnId, worldRanking: p.worldRanking },
    });

    // Add to field if not already there
    await prisma.majorField.upsert({
      where: { majorId_playerId: { majorId: major.id, playerId: player.id } },
      update: {},
      create: { majorId: major.id, playerId: player.id },
    });
    added++;
  }

  await prisma.major.update({
    where: { id: major.id },
    data: { status: 'FIELD_READY' },
  });

  res.json({ added, status: 'FIELD_READY' });
});

// POST /api/majors/:id/open-draft (admin)
router.post('/:id/open-draft', authenticate, requireAdmin, async (req, res) => {
  const major = await prisma.major.findUnique({ where: { id: req.params.id } });
  if (!major) return res.status(404).json({ error: 'Major not found' });
  if (major.status === 'DRAFT_OPEN') return res.status(400).json({ error: 'Draft already open' });
  if (!['FIELD_READY', 'UPCOMING'].includes(major.status)) {
    return res.status(400).json({ error: 'Major is not in a state to open draft' });
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length < 2) return res.status(400).json({ error: 'Need at least 2 users' });

  // Pad or trim to 6 for snake generation; adjust if fewer users
  const userIds = users.map((u) => u.id);
  const n = userIds.length;

  // Build snake order for n users, 3 rounds
  const shuffled = [...userIds].sort(() => Math.random() - 0.5);
  const round1 = [...shuffled];
  const round2 = [...shuffled].reverse();
  const round3 = [...shuffled];
  const draftOrder = [...round1, ...round2, ...round3];

  await prisma.major.update({
    where: { id: major.id },
    data: {
      status: 'DRAFT_OPEN',
      draftOrder,
      currentDraftTurn: 0,
      draftOpenedAt: new Date(),
    },
  });

  res.json({ draftOrder, firstPickUserId: draftOrder[0] });
});

// POST /api/majors/:id/sync-results (admin)
router.post('/:id/sync-results', authenticate, requireAdmin, async (req, res) => {
  const major = await prisma.major.findUnique({ where: { id: req.params.id } });
  if (!major) return res.status(404).json({ error: 'Major not found' });
  if (!major.espnEventId) return res.status(400).json({ error: 'Set espnEventId first' });

  // Optional: manual override purse + position-based calc
  const { purse } = req.body; // purse in dollars, optional

  let results;
  try {
    results = await getEventResults(major.espnEventId);
  } catch (err) {
    return res.status(502).json({ error: `ESPN fetch failed: ${err.message}` });
  }

  let synced = 0;
  for (const r of results) {
    const player = await prisma.player.findUnique({ where: { espnId: r.espnId } });
    if (!player) continue;

    let prizeMoney = r.prizeMoney;

    // If ESPN didn't return earnings but we have a purse + position, calculate
    if (!prizeMoney && purse && r.position && r.position !== 'MC' && r.position !== 'WD' && r.position !== 'DQ') {
      prizeMoney = calcPrizeMoney(purse, r.position);
    }

    await prisma.playerEarning.upsert({
      where: { playerId_majorId: { playerId: player.id, majorId: major.id } },
      update: { prizeMoney, position: r.position },
      create: { playerId: player.id, majorId: major.id, prizeMoney, position: r.position },
    });
    synced++;
  }

  res.json({ synced });
});

// POST /api/majors/:id/complete (admin)
router.post('/:id/complete', authenticate, requireAdmin, async (req, res) => {
  const major = await prisma.major.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED' },
  });
  res.json(major);
});

// GET /api/majors/espn/events (admin) — list upcoming ESPN events
router.get('/espn/events', authenticate, requireAdmin, async (req, res) => {
  try {
    const events = await getUpcomingEvents();
    res.json(events);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Standard PGA Tour payout percentages (top 70 make cut)
const PAYOUT_PCTS = [
  18, 10.9, 6.9, 4.9, 4.1, 3.625, 3.375, 3.125, 2.925, 2.725,
  2.525, 2.325, 2.125, 1.925, 1.825, 1.725, 1.625, 1.525, 1.425, 1.35,
  1.275, 1.2, 1.125, 1.05, 0.975, 0.9, 0.875, 0.85, 0.825, 0.8,
  0.775, 0.75, 0.725, 0.7, 0.675, 0.65, 0.625, 0.6, 0.575, 0.55,
  0.525, 0.5, 0.475, 0.45, 0.425, 0.4, 0.375, 0.35, 0.325, 0.3,
];

function calcPrizeMoney(purseUsd, position) {
  // Parse position — "T5" → 5, "1" → 1
  const pos = parseInt(String(position).replace(/[^\d]/g, ''));
  if (!pos || pos < 1 || pos > PAYOUT_PCTS.length) return 0;
  return Math.round((PAYOUT_PCTS[pos - 1] / 100) * purseUsd * 100); // return cents
}

module.exports = router;
