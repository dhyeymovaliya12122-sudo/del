const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'data', 'whatsapp.db');
const db = new Database(dbPath);

async function fix() {
  const hash = await bcrypt.hash('changeme', 10);
  
  // Check if superadmin exists
  const exists = db.prepare('SELECT id FROM app_users WHERE username = ?').get('superadmin');
  
  if (exists) {
    db.prepare('UPDATE app_users SET password_hash = ? WHERE username = ?').run(hash, 'superadmin');
    console.log("Updated existing superadmin password.");
  } else {
    db.prepare(`
      INSERT INTO app_users (id, username, password_hash, role, display_name, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('superadmin', 'superadmin', hash, 'SUPER_ADMIN', 'Super Admin', 1);
    console.log("Created missing superadmin user.");
  }
}

fix().catch(console.error);
