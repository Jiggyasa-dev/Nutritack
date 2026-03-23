const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({
      name:      u.display_name || u.name,
      email:     u.email || '',
      avatar:    u.avatar_url || '',
      weight:    u.weight?.toString()  || '',
      height:    u.height?.toString()  || '',
      age:       u.age?.toString()     || '',
      gender:    u.gender    || 'Male',
      goal:      u.goal      || 'Maintain',
      dailyGoal: u.daily_goal || 2000,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile
router.put('/', async (req, res) => {
  const { name, weight, height, age, gender, goal, dailyGoal } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           weight     = COALESCE($2, weight),
           height     = COALESCE($3, height),
           age        = COALESCE($4, age),
           gender     = COALESCE($5, gender),
           goal       = COALESCE($6, goal),
           daily_goal = COALESCE($7, daily_goal),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name    || null,
        weight  ? parseFloat(weight)       : null,
        height  ? parseFloat(height)       : null,
        age     ? parseInt(age, 10)        : null,
        gender  || null,
        goal    || null,
        dailyGoal ? parseInt(dailyGoal, 10) : null,
        req.userId,
      ]
    );
    const u = rows[0];
    res.json({
      name:      u.display_name || u.name,
      email:     u.email || '',
      avatar:    u.avatar_url || '',
      weight:    u.weight?.toString() || '',
      height:    u.height?.toString() || '',
      age:       u.age?.toString()    || '',
      gender:    u.gender,
      goal:      u.goal,
      dailyGoal: u.daily_goal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
