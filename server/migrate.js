/**
 * Run once: adds google auth columns to users table
 * node migrate.js
 */
require('dotenv').config();
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration...');

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_id   TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS email       TEXT,
        ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
        ADD COLUMN IF NOT EXISTS display_name TEXT;
    `);

    // Make sure the legacy guest user still works (no google_id required for now)
    console.log('✅ Migration complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => { console.error(err); process.exit(1); });
