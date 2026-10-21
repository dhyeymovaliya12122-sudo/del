const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

console.log('=== CHECK CHATS NEAR 1763391823000 (17/11/2025) ===');
const chats1 = db.prepare('SELECT id, name, is_group, last_message_timestamp FROM whatsapp_chats WHERE last_message_timestamp BETWEEN 1763000000000 AND 1764000000000').all();
console.log(chats1);

console.log('\n=== CHECK CHATS NEAR 1789995213000 (21/09/2025) ===');
const chats2 = db.prepare('SELECT id, name, is_group, last_message_timestamp FROM whatsapp_chats WHERE last_message_timestamp BETWEEN 1789000000000 AND 1791000000000').all();
console.log(chats2);
