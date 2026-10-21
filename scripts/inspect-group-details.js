const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

console.log('=== CHECK CONTACT_GROUP_MEMBERS / CHAT DETAILS ===');
const chats = db.prepare("SELECT * FROM whatsapp_chats WHERE id IN ('120363406394680712@g.us', '120363428017406091@g.us', '120363413968168848@g.us')").all();
console.log(chats);

console.log('\n=== CHECK ALL MESSAGES IN WHATSAPP_MESSAGES ===');
const msgs = db.prepare("SELECT chat_jid, count(*) as cnt FROM whatsapp_messages GROUP BY chat_jid").all();
console.log('Chats with messages:', msgs.length);
