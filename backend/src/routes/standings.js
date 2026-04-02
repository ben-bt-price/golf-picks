const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/standings  — season leaderboard
router.get('/', authenticate, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  });

  const majors = await prisma.major.findMany({
    orderBy: { startDate: 'asc' },
    select: { id: true, name: true, status: true },
  });

  // For each user, get all their picks + earnings
  const standings = await Promise.all(
    users.map(async (user) => {
      const picks = await prisma.pick.findMany({
        where: { userId: user.id },
        include: {
          player: { include: { earnings: true } },
          major: { select: { id: true, name: true, status: true } },
        },
      });

      let totalEarnings = 0;
      const byMajor = {};

      for (const pick of picks) {
        const earning = pick.player.earnings.find((e) => e.majorId === pick.majorId);
        const prizeMoney = earning?.prizeMoney || 0;
        totalEarnings += prizeMoney;

        if (!byMajor[pick.majorId]) {
          byMajor[pick.majorId] = {
            majorId: pick.majorId,
            majorName: pick.major.name,
            majorStatus: pick.major.status,
            picks: [],
            earnings: 0,
          };
        }
        byMajor[pick.majorId].picks.push({
          playerName: pick.player.name,
          prizeMoney,
          position: earning?.position || null,
        });
        byMajor[pick.majorId].earnings += prizeMoney;
      }

      return {
        userId: user.id,
        userName: user.name,
        totalEarnings,
        byMajor: Object.values(byMajor),
      };
    })
  );

  standings.sort((a, b) => b.totalEarnings - a.totalEarnings);

  res.json({ standings, majors });
});

// GET /api/standings/:majorId  — per-major breakdown
router.get('/:majorId', authenticate, async (req, res) => {
  const major = await prisma.major.findUnique({
    where: { id: req.params.majorId },
    select: { id: true, name: true, status: true },
  });
  if (!major) return res.status(404).json({ error: 'Major not found' });

  const picks = await prisma.pick.findMany({
    where: { majorId: major.id },
    include: {
      user: { select: { id: true, name: true } },
      player: {
        include: {
          earnings: { where: { majorId: major.id } },
        },
      },
    },
    orderBy: { draftSlot: 'asc' },
  });

  const byUser = {};
  for (const pick of picks) {
    if (!byUser[pick.userId]) {
      byUser[pick.userId] = { userId: pick.userId, userName: pick.user.name, picks: [], totalEarnings: 0 };
    }
    const earning = pick.player.earnings[0];
    const prizeMoney = earning?.prizeMoney || 0;
    byUser[pick.userId].picks.push({
      playerName: pick.player.name,
      prizeMoney,
      position: earning?.position || null,
      pickOrder: pick.pickOrder,
    });
    byUser[pick.userId].totalEarnings += prizeMoney;
  }

  const result = Object.values(byUser).sort((a, b) => b.totalEarnings - a.totalEarnings);
  res.json({ major, standings: result });
});

module.exports = router;
