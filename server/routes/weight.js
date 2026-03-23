const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/weight?limit=30
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit || '30', 10);
  try {
    const { rows } = await pool.query(
      `SELECT date::TEXT, weight::FLOAT FROM weight_logs
       WHERE user_id = $1 ORDER BY date DESC LIMIT $2`,
      [req.userId, limit]
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/weight
router.post('/', async (req, res) => {
  const { weight, date } = req.body;
  if (!weight) return res.status(400).json({ error: 'weight is required' });
  const targetDate = date || new Date().toISOString().split('T')[0];
  try {
    const { rows } = await pool.query(
      `INSERT INTO weight_logs (user_id, date, weight)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET weight = EXCLUDED.weight, created_at = NOW()
       RETURNING date::TEXT, weight::FLOAT`,
      [req.userId, targetDate, parseFloat(weight)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/weight/stats
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT date::TEXT, weight::FLOAT FROM weight_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 7`,
      [req.userId]
    );
    if (!rows.length) return res.json({ current: null, change: null, avg: null, bmi: null });

    const weights = rows.map((r) => r.weight);
    const current = weights[0];
    const start   = weights[weights.length - 1];
    const avg     = +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);

    const { rows: userRows } = await pool.query('SELECT height FROM users WHERE id = $1', [req.userId]);
    const height = userRows[0]?.height;
    const bmi = height ? parseFloat((current / Math.pow(height / 100, 2)).toFixed(1)) : null;

    res.json({ current, change: +(current - start).toFixed(1), avg, bmi });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
