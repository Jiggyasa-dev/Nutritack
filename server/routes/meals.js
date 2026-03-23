const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/meals/:date
router.get('/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM meal_logs WHERE user_id = $1 AND date = $2 ORDER BY created_at ASC`,
      [req.userId, date]
    );
    const log = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
    for (const r of rows) {
      if (log[r.meal_type] !== undefined) {
        log[r.meal_type].push({
          id:       r.id.toString(),
          name:     r.food_name,
          calories: parseFloat(r.calories),
          protein:  parseFloat(r.protein),
          carbs:    parseFloat(r.carbs),
          fat:      parseFloat(r.fat),
          unit:     r.unit,
          icon:     r.icon,
        });
      }
    }
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meals
router.post('/', async (req, res) => {
  const { date, mealType, food } = req.body;
  if (!date || !mealType || !food)
    return res.status(400).json({ error: 'date, mealType and food are required' });
  if (!['Breakfast', 'Lunch', 'Dinner', 'Snacks'].includes(mealType))
    return res.status(400).json({ error: 'Invalid mealType' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO meal_logs (user_id, date, meal_type, food_name, calories, protein, carbs, fat, unit, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.userId, date, mealType, food.name,
        parseFloat(food.calories) || 0,
        parseFloat(food.protein)  || 0,
        parseFloat(food.carbs)    || 0,
        parseFloat(food.fat)      || 0,
        food.unit || '100g',
        food.icon || '🍽️',
      ]
    );
    const r = rows[0];
    res.status(201).json({
      id:       r.id.toString(),
      name:     r.food_name,
      calories: parseFloat(r.calories),
      protein:  parseFloat(r.protein),
      carbs:    parseFloat(r.carbs),
      fat:      parseFloat(r.fat),
      unit:     r.unit,
      icon:     r.icon,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/meals/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM meal_logs WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/meals/summary/:date
router.get('/summary/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT meal_type,
              COUNT(*)::INT           AS items,
              SUM(calories)::FLOAT    AS calories,
              SUM(protein)::FLOAT     AS protein,
              SUM(carbs)::FLOAT       AS carbs,
              SUM(fat)::FLOAT         AS fat
       FROM meal_logs WHERE user_id = $1 AND date = $2
       GROUP BY meal_type`,
      [req.userId, date]
    );
    const summary = { Breakfast: null, Lunch: null, Dinner: null, Snacks: null };
    for (const r of rows) {
      summary[r.meal_type] = {
        items: r.items, calories: r.calories || 0,
        protein: r.protein || 0, carbs: r.carbs || 0, fat: r.fat || 0,
      };
    }
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
