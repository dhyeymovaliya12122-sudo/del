const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

const groupIds = [
  '120363406394680712@g.us',
  '120363428017406091@g.us',
  '120363413968168848@g.us'
];

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

console.log('Searching all tables for the 3 groups:');
for (const table of tables) {
  try {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name);
    for (const col of cols) {
      for (const gid of groupIds) {
        const rawGid = gid.split('@')[0];
        const match = db.prepare(`SELECT * FROM "${table}" WHERE "${col}" LIKE ? LIMIT 1`).get(`%${rawGid}%`);
        if (match) {
          console.log(`Found in table [${table}], column [${col}]:`, match);
        }
      }
    }
  } catch (e) {}
}
