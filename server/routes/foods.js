const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/foods?q=query&category=Fruits&limit=30
router.get('/', async (req, res) => {
  const { q, category, limit = 40 } = req.query;
  try {
    let sql = 'SELECT * FROM foods';
    const params = [];
    const conditions = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10));

    const { rows } = await pool.query(sql, params);
    res.json(rows.map((f) => ({
      id:       f.id.toString(),
      name:     f.name,
      calories: parseFloat(f.calories),
      protein:  parseFloat(f.protein),
      carbs:    parseFloat(f.carbs),
      fat:      parseFloat(f.fat),
      fiber:    parseFloat(f.fiber),
      unit:     f.unit,
      icon:     f.icon,
      category: f.category,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/foods/categories
router.get('/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT category, COUNT(*) as count FROM foods GROUP BY category ORDER BY category'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
