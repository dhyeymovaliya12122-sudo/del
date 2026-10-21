const Database = require('better-sqlite3');
const db = new Database('./data/whatsapp.db');

const chats = db.prepare('SELECT id, name, is_group FROM whatsapp_chats WHERE is_group = 0').all();
console.log('Direct 1-on-1 chats in DB count:', chats.length);
console.log('Direct chats sample:', chats.slice(0, 10));

const msgs = db.prepare("SELECT DISTINCT sender_jid, sender_name FROM whatsapp_messages WHERE sender_name IS NOT NULL AND sender_name != ''").all();
console.log('Distinct sender names in messages:', msgs.length);
console.log('Sample senders:', msgs.slice(0, 15));

const nonLidContacts = db.prepare("SELECT id, name, phone_number, notify_name FROM whatsapp_contacts WHERE id NOT LIKE '%@lid'").all();
console.log('Non-LID contacts count in DB:', nonLidContacts.length);
console.log('Non-LID contacts sample:', nonLidContacts.slice(0, 10));

db.close();
