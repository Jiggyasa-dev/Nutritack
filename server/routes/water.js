const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/water/:date
router.get('/:date', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT glasses FROM water_logs WHERE user_id = $1 AND date = $2',
      [req.userId, req.params.date]
    );
    res.json({ glasses: rows[0]?.glasses || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/water
router.post('/', async (req, res) => {
  const { date, glasses } = req.body;
  if (date === undefined || glasses === undefined)
    return res.status(400).json({ error: 'date and glasses are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO water_logs (user_id, date, glasses)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET glasses = EXCLUDED.glasses
       RETURNING glasses`,
      [req.userId, date, parseInt(glasses, 10)]
    );
    res.json({ glasses: rows[0].glasses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
