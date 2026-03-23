const express = require('express');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool    = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'nutritrack-dev-secret-change-in-prod';

/**
 * POST /api/auth/google
 * Body: { accessToken: string }   (from expo-auth-session)
 *
 * 1. Calls Google userinfo endpoint with the access token
 * 2. Finds or creates the user in DB
 * 3. Returns a signed JWT + user info
 */
router.post('/google', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'accessToken is required' });

  try {
    // Fetch user info from Google
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid Google access token' });
    }
    const googleUser = await googleRes.json();
    // { sub, email, name, picture, given_name, family_name }

    const { sub: googleId, email, name, picture } = googleUser;

    // Find or create user
    const upsert = await pool.query(
      `INSERT INTO users (google_id, email, display_name, avatar_url, name)
       VALUES ($1, $2, $3, $4, $3)
       ON CONFLICT (google_id) DO UPDATE
         SET email        = EXCLUDED.email,
             display_name = EXCLUDED.display_name,
             avatar_url   = EXCLUDED.avatar_url
       RETURNING id, name, email, display_name, avatar_url, weight, height, age, gender, goal, daily_goal`,
      [googleId, email, name, picture]
    );

    const user = upsert.rows[0];

    // Sign JWT (30-day expiry)
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: '30d' });

    return res.json({
      token,
      user: {
        id:         user.id,
        name:       user.display_name || user.name,
        email:      user.email,
        avatar:     user.avatar_url,
        weight:     user.weight || '',
        height:     user.height || '',
        age:        user.age    || '',
        gender:     user.gender || 'Male',
        goal:       user.goal   || 'Maintain',
        dailyGoal:  user.daily_goal || 2000,
      },
    });
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns the current user from the JWT token.
 */
router.get('/me', async (req, res) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token' });

  const token = header.replace(/^Bearer\s+/i, '');
  try {
    const { SECRET: s } = require('../middleware/auth');
    const payload = jwt.verify(token, SECRET);
    const { rows } = await pool.query(
      `SELECT id, name, display_name, email, avatar_url, weight, height, age, gender, goal, daily_goal
       FROM users WHERE id = $1`,
      [payload.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.json({
      id:        u.id,
      name:      u.display_name || u.name,
      email:     u.email,
      avatar:    u.avatar_url,
      weight:    u.weight || '',
      height:    u.height || '',
      age:       u.age    || '',
      gender:    u.gender || 'Male',
      goal:      u.goal   || 'Maintain',
      dailyGoal: u.daily_goal || 2000,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
