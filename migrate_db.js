const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'data', 'whatsapp.db');
const db = new Database(dbPath);

try {
  // Add email column
  try {
    db.prepare('ALTER TABLE app_users ADD COLUMN email varchar').run();
    console.log('Added email column to app_users');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('email column already exists');
    } else {
      throw e;
    }
  }

  // Create password_resets table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS password_resets (
      user_id varchar PRIMARY KEY,
      token_hash varchar NOT NULL,
      expires_at datetime NOT NULL,
      created_at datetime DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log('Created password_resets table');

} catch (err) {
  console.error(err);
}
