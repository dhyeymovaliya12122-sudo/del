const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

console.log('=== INDEXES ON WHATSAPP_MESSAGES ===');
const indexes = db.prepare('PRAGMA index_list(whatsapp_messages)').all();
for (const idx of indexes) {
  const info = db.prepare(`PRAGMA index_info(${idx.name})`).all();
  console.log(`Index: ${idx.name} (unique: ${idx.unique}) ->`, info.map(i => i.name));
}
