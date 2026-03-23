/**
 * Run once to create all tables and seed the food database.
 * node server/schema.js
 */
const pool = require('./db');

async function createSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Users ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100)   DEFAULT 'Guest',
        weight      DECIMAL(5,2),
        height      DECIMAL(5,2),
        age         INTEGER,
        gender      VARCHAR(10)    DEFAULT 'Male',
        goal        VARCHAR(20)    DEFAULT 'Maintain',
        daily_goal  INTEGER        DEFAULT 2000,
        created_at  TIMESTAMP      DEFAULT NOW(),
        updated_at  TIMESTAMP      DEFAULT NOW()
      );
    `);

    // Ensure at least one user row exists (id = 1)
    await client.query(`
      INSERT INTO users (id, name) VALUES (1, 'Guest')
      ON CONFLICT (id) DO NOTHING;
    `);

    // ── Foods master table ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(200) NOT NULL,
        calories  DECIMAL(8,2) NOT NULL,
        protein   DECIMAL(8,2) DEFAULT 0,
        carbs     DECIMAL(8,2) DEFAULT 0,
        fat       DECIMAL(8,2) DEFAULT 0,
        fiber     DECIMAL(8,2) DEFAULT 0,
        unit      VARCHAR(80)  DEFAULT '100g',
        icon      VARCHAR(10)  DEFAULT '🍽️',
        category  VARCHAR(50)  DEFAULT 'Other'
      );
    `);

    // ── Meal logs ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER      DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date        DATE         NOT NULL,
        meal_type   VARCHAR(20)  NOT NULL,
        food_name   VARCHAR(200) NOT NULL,
        calories    DECIMAL(8,2) DEFAULT 0,
        protein     DECIMAL(8,2) DEFAULT 0,
        carbs       DECIMAL(8,2) DEFAULT 0,
        fat         DECIMAL(8,2) DEFAULT 0,
        unit        VARCHAR(80)  DEFAULT '100g',
        icon        VARCHAR(10)  DEFAULT '🍽️',
        created_at  TIMESTAMP    DEFAULT NOW()
      );
    `);

    // ── Weight logs ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS weight_logs (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER      DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date        DATE         NOT NULL,
        weight      DECIMAL(5,2) NOT NULL,
        created_at  TIMESTAMP    DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);

    // ── Water logs ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS water_logs (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        date        DATE    NOT NULL,
        glasses     INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);

    // ── Seed food database ──────────────────────────────────
    await client.query(`DELETE FROM foods;`);
    await client.query(`
      INSERT INTO foods (name, calories, protein, carbs, fat, fiber, unit, icon, category) VALUES
      -- Fruits
      ('Apple',             52,  0.3, 14.0, 0.2, 2.4, '1 medium (182g)',   '🍎', 'Fruits'),
      ('Banana',            89,  1.1, 23.0, 0.3, 2.6, '1 medium (118g)',   '🍌', 'Fruits'),
      ('Orange',            47,  0.9, 12.0, 0.1, 2.4, '1 medium (131g)',   '🍊', 'Fruits'),
      ('Mango',             60,  0.8, 15.0, 0.4, 1.6, '100g',              '🥭', 'Fruits'),
      ('Grapes',            69,  0.7, 18.0, 0.2, 0.9, '100g',              '🍇', 'Fruits'),
      ('Watermelon',        30,  0.6,  7.6, 0.2, 0.4, '100g',              '🍉', 'Fruits'),
      ('Papaya',            43,  0.5, 11.0, 0.3, 1.7, '100g',              '🍈', 'Fruits'),
      ('Pineapple',         50,  0.5, 13.0, 0.1, 1.4, '100g',              '🍍', 'Fruits'),
      ('Strawberry',        32,  0.7,  7.7, 0.3, 2.0, '100g',              '🍓', 'Fruits'),
      -- Vegetables
      ('Broccoli',          34,  2.8,  6.6, 0.4, 2.6, '100g',              '🥦', 'Vegetables'),
      ('Spinach',           23,  2.9,  3.6, 0.4, 2.2, '100g',              '🥬', 'Vegetables'),
      ('Carrot',            41,  0.9,  9.6, 0.2, 2.8, '100g',              '🥕', 'Vegetables'),
      ('Tomato',            18,  0.9,  3.9, 0.2, 1.2, '1 medium (123g)',   '🍅', 'Vegetables'),
      ('Cucumber',          15,  0.7,  3.6, 0.1, 0.5, '100g',              '🥒', 'Vegetables'),
      ('Onion',             40,  1.1,  9.3, 0.1, 1.7, '100g',              '🧅', 'Vegetables'),
      ('Potato',            77,  2.0, 17.5, 0.1, 2.2, '1 medium (150g)',   '🥔', 'Vegetables'),
      -- Grains & Cereals
      ('White Rice (cooked)',  130, 2.7, 28.0, 0.3, 0.4, '100g',           '🍚', 'Grains'),
      ('Brown Rice (cooked)',  112, 2.6, 23.5, 0.9, 1.8, '100g',           '🍚', 'Grains'),
      ('Oatmeal (cooked)',      71, 2.5, 12.0, 1.5, 1.7, '100g',           '🥣', 'Grains'),
      ('Roti / Chapati',        71, 2.7, 13.5, 1.0, 0.5, '1 piece (40g)',  '🫓', 'Grains'),
      ('Whole Wheat Bread',    247, 13.0, 41.0, 3.4, 7.0, '100g',          '🍞', 'Grains'),
      ('White Bread',          265,  9.0, 51.0, 3.2, 2.7, '100g',          '🍞', 'Grains'),
      ('Poha (cooked)',         110, 2.0, 23.0, 1.2, 0.5, '100g',          '🥘', 'Grains'),
      ('Upma (cooked)',         105, 3.0, 18.0, 2.5, 1.0, '100g',          '🥘', 'Grains'),
      ('Idli',                  58, 2.0, 12.0, 0.2, 0.5, '1 piece (50g)',  '🫔', 'Grains'),
      ('Dosa (plain)',          168, 4.0, 32.0, 2.5, 1.0, '1 dosa (90g)',  '🥞', 'Grains'),
      -- Proteins
      ('Chicken Breast (grilled)', 165, 31.0,  0.0, 3.6, 0.0, '100g',    '🍗', 'Proteins'),
      ('Chicken Thigh (grilled)',  209, 26.0,  0.0, 11.0, 0.0, '100g',   '🍗', 'Proteins'),
      ('Egg (boiled)',            155, 13.0,  1.1, 11.0, 0.0, '2 large (100g)', '🥚', 'Proteins'),
      ('Egg White',               52, 11.0,  0.7, 0.2, 0.0, '100g',       '🥚', 'Proteins'),
      ('Salmon',                  208, 20.0,  0.0, 13.0, 0.0, '100g',     '🐟', 'Proteins'),
      ('Tuna (canned)',           132, 29.0,  0.0, 1.0, 0.0, '100g',      '🐟', 'Proteins'),
      ('Paneer',                  265, 18.0,  1.2, 20.0, 0.0, '100g',     '🧀', 'Proteins'),
      ('Dal (cooked)',            116,  9.0, 20.0, 0.7, 7.9, '100g',      '🫘', 'Proteins'),
      ('Rajma (cooked)',          127,  8.7, 22.8, 0.5, 6.4, '100g',      '🫘', 'Proteins'),
      ('Chana (chickpeas)',       164,  8.9, 27.0, 2.6, 7.6, '100g',      '🫘', 'Proteins'),
      ('Lentils (masoor dal)',    116,  9.0, 20.0, 0.4, 7.9, '100g',      '🫘', 'Proteins'),
      ('Tofu',                    76,  8.0,  1.9, 4.2, 0.3, '100g',       '🧊', 'Proteins'),
      -- Dairy
      ('Whole Milk',              61,  3.2,  4.8, 3.3, 0.0, '100ml',      '🥛', 'Dairy'),
      ('Skimmed Milk',            35,  3.4,  5.0, 0.1, 0.0, '100ml',      '🥛', 'Dairy'),
      ('Greek Yogurt',            59, 10.0,  3.6, 0.4, 0.0, '100g',       '🥛', 'Dairy'),
      ('Curd / Dahi',             60,  3.5,  4.0, 3.3, 0.0, '100g',       '🥛', 'Dairy'),
      ('Cheddar Cheese',         402, 25.0,  1.3, 33.0, 0.0, '100g',      '🧀', 'Dairy'),
      ('Butter',                  717,  0.9,  0.1, 81.0, 0.0, '100g',     '🧈', 'Dairy'),
      -- Nuts & Oils
      ('Almonds',                579, 21.0, 22.0, 50.0, 12.5, '100g',    '🌰', 'Nuts'),
      ('Walnuts',                654, 15.0, 14.0, 65.0,  6.7, '100g',    '🌰', 'Nuts'),
      ('Peanuts',                567, 26.0, 16.0, 49.0,  8.5, '100g',    '🥜', 'Nuts'),
      ('Peanut Butter',          588, 25.0,  6.0, 50.0,  6.0, '2 tbsp (32g)', '🥜', 'Nuts'),
      ('Coconut Oil',            862,  0.0,  0.0, 100.0, 0.0, '1 tbsp (14g)', '🫙', 'Oils'),
      ('Olive Oil',              884,  0.0,  0.0, 100.0, 0.0, '1 tbsp (14g)', '🫙', 'Oils'),
      -- Snacks & Sweets
      ('Samosa (1 pc)',          262,  4.0, 31.0, 14.0,  2.0, '1 piece (80g)', '🥟', 'Snacks'),
      ('Biscuit / Digestive',    471,  7.0, 68.0, 20.0,  3.0, '100g',    '🍪', 'Snacks'),
      ('Dark Chocolate',         546,  5.0, 60.0, 31.0,  7.0, '100g',    '🍫', 'Snacks'),
      ('Potato Chips',           536,  7.0, 53.0, 35.0,  4.4, '100g',    '🥔', 'Snacks'),
      ('Avocado',                160,  2.0,  9.0, 15.0,  6.7, '100g',    '🥑', 'Snacks'),
      -- Beverages
      ('Orange Juice',            45,  0.7, 10.4, 0.2, 0.2, '100ml',     '🧃', 'Beverages'),
      ('Coconut Water',           19,  0.7,  3.7, 0.2, 1.1, '100ml',     '🥥', 'Beverages'),
      ('Chai (with milk & sugar)', 50, 1.0,  8.0, 1.5, 0.0, '1 cup (200ml)', '☕', 'Beverages'),
      ('Coffee (black)',           2,  0.3,  0.0, 0.0, 0.0, '1 cup (240ml)', '☕', 'Beverages')
      ON CONFLICT DO NOTHING;
    `);

    // ── Seed sample weight data ─────────────────────────────
    await client.query(`
      INSERT INTO weight_logs (user_id, date, weight) VALUES
        (1, CURRENT_DATE - 6, 78.0),
        (1, CURRENT_DATE - 5, 77.5),
        (1, CURRENT_DATE - 4, 77.2),
        (1, CURRENT_DATE - 3, 77.0),
        (1, CURRENT_DATE - 2, 76.5),
        (1, CURRENT_DATE - 1, 76.8),
        (1, CURRENT_DATE,     76.2)
      ON CONFLICT (user_id, date) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Schema created and data seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createSchema();
