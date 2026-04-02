const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendSetupEmail } = require('../services/email');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users  (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isAdmin: true, isSetup: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// POST /api/users  (admin only) — create user + send setup email
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name required' });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), name },
  });

  // Generate setup token
  const setupToken = jwt.sign(
    { userId: user.id, type: 'setup' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  await prisma.user.update({ where: { id: user.id }, data: { setupToken } });

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const setupUrl = `${appUrl}/setup?token=${setupToken}`;

  try {
    await sendSetupEmail({ to: user.email, name: user.name, setupUrl });
  } catch (err) {
    console.error('Email send failed:', err.message);
    // Don't fail the request — admin can resend
  }

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    isSetup: false,
    setupUrl, // Return for admin to share manually if email fails
  });
});

// POST /api/users/:id/resend-invite  (admin only)
router.post('/:id/resend-invite', authenticate, requireAdmin, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isSetup) return res.status(400).json({ error: 'User already set up' });

  const setupToken = jwt.sign(
    { userId: user.id, type: 'setup' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  await prisma.user.update({ where: { id: user.id }, data: { setupToken } });

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const setupUrl = `${appUrl}/setup?token=${setupToken}`;

  try {
    await sendSetupEmail({ to: user.email, name: user.name, setupUrl });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }

  res.json({ setupUrl });
});

// DELETE /api/users/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
