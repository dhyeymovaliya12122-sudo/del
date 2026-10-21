const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

console.log('=== CREATING FIFO / TTL COMPOUND INDEX ===');
db.prepare('CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_fifo_ttl ON whatsapp_messages (created_at ASC, id ASC)').run();
console.log('✅ Index idx_whatsapp_messages_fifo_ttl created successfully');

const check = db.prepare('PRAGMA index_list(whatsapp_messages)').all();
console.log('Indexes now:', check.map(i => i.name));
