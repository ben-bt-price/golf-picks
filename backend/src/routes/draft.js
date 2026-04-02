const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { whoseTurn, userPickCount } = require('../services/draft');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/majors/:id/draft  — draft board state
router.get('/:id/draft', authenticate, async (req, res) => {
  const major = await prisma.major.findUnique({
    where: { id: req.params.id },
    include: {
      picks: {
        include: { user: { select: { id: true, name: true } }, player: true },
        orderBy: { draftSlot: 'asc' },
      },
      playerFields: { include: { player: true } },
    },
  });
  if (!major) return res.status(404).json({ error: 'Major not found' });

  const pickedPlayerIds = new Set(major.picks.map((p) => p.playerId));
  const availablePlayers = major.playerFields
    .map((f) => f.player)
    .filter((p) => !pickedPlayerIds.has(p.id))
    .sort((a, b) => (a.worldRanking || 999) - (b.worldRanking || 999));

  const currentPickUserId = whoseTurn(major.draftOrder, major.currentDraftTurn);
  const isMyTurn = currentPickUserId === req.user.id;

  // Build board by user
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const board = users.map((u) => ({
    userId: u.id,
    userName: u.name,
    picks: major.picks.filter((p) => p.userId === u.id).map((p) => ({
      draftSlot: p.draftSlot,
      pickOrder: p.pickOrder,
      player: p.player,
    })),
  }));

  res.json({
    majorId: major.id,
    majorName: major.name,
    status: major.status,
    currentDraftTurn: major.currentDraftTurn,
    totalSlots: major.draftOrder.length,
    currentPickUserId,
    isMyTurn,
    board,
    availablePlayers: major.status === 'DRAFT_OPEN' ? availablePlayers : [],
    draftOrder: major.draftOrder,
  });
});

// POST /api/majors/:id/picks  — submit a pick
router.post('/:id/picks', authenticate, async (req, res) => {
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });

  const major = await prisma.major.findUnique({
    where: { id: req.params.id },
    include: { picks: true, playerFields: true },
  });
  if (!major) return res.status(404).json({ error: 'Major not found' });
  if (major.status !== 'DRAFT_OPEN') return res.status(400).json({ error: 'Draft is not open' });

  const currentPickUserId = whoseTurn(major.draftOrder, major.currentDraftTurn);
  if (currentPickUserId !== req.user.id) {
    return res.status(403).json({ error: 'It is not your turn' });
  }

  // Check player is in field
  const inField = major.playerFields.some((f) => f.playerId === playerId);
  if (!inField) return res.status(400).json({ error: 'Player not in this major\'s field' });

  // Check player not already picked
  const alreadyPicked = major.picks.some((p) => p.playerId === playerId);
  if (alreadyPicked) return res.status(400).json({ error: 'Player already picked' });

  const myPickCount = userPickCount(major.picks, req.user.id);
  const draftSlot = major.currentDraftTurn;
  const pickOrder = myPickCount + 1;

  const pick = await prisma.pick.create({
    data: {
      userId: req.user.id,
      majorId: major.id,
      playerId,
      draftSlot,
      pickOrder,
    },
    include: { player: true },
  });

  const newTurn = major.currentDraftTurn + 1;
  const draftComplete = newTurn >= major.draftOrder.length;

  await prisma.major.update({
    where: { id: major.id },
    data: {
      currentDraftTurn: newTurn,
      status: draftComplete ? 'IN_PROGRESS' : 'DRAFT_OPEN',
    },
  });

  const nextPickUserId = draftComplete ? null : major.draftOrder[newTurn];

  res.json({ pick, nextPickUserId, draftComplete });
});

module.exports = router;
