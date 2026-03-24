require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./db');

const authMiddleware = require('./middleware/auth');
const authRouter    = require('./routes/auth');
const profileRouter = require('./routes/profile');
const mealsRouter   = require('./routes/meals');
const weightRouter  = require('./routes/weight');
const waterRouter   = require('./routes/water');
const foodsRouter   = require('./routes/foods');
const analyzeRouter = require('./routes/analyze');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Request logger ──────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11,19)} ${req.method} ${req.path}`);
  next();
});

// ── Auth (no middleware needed — handles token internally) ───
app.use('/api/auth', authRouter);

// ── All other routes require auth middleware ─────────────────
app.use(authMiddleware);

// ── Routes ──────────────────────────────────────────────────
app.use('/api/profile', profileRouter);
app.use('/api/meals',   mealsRouter);
app.use('/api/weight',  weightRouter);
app.use('/api/water',   waterRouter);
app.use('/api/foods',        foodsRouter);
app.use('/api/analyze-food', analyzeRouter);

// ── Root endpoint ────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'NutriTrack API' }));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', db: 'connected', time: rows[0].time });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NutriTrack API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
