const Database = require('better-sqlite3');
const db = new Database('./data/whatsapp.db');

const rows = db.prepare("SELECT id, name, notify_name, phone_number FROM whatsapp_contacts").all();
console.log('Total in DB:', rows.length);

const withLetters = rows.filter(r => r.name && /[a-zA-Z]/.test(r.name));
console.log('Contacts with letters in name:', withLetters.length, withLetters);

const withLettersNotify = rows.filter(r => r.notify_name && /[a-zA-Z]/.test(r.notify_name));
console.log('Contacts with letters in notify_name:', withLettersNotify.length, withLettersNotify);

const withNormalPhone = rows.filter(r => r.id && !r.id.endsWith('@lid'));
console.log('Contacts with non-lid id:', withNormalPhone.length, withNormalPhone);

// Check messages table to see if there are any messages with pushName or remoteJid
const msgs = db.prepare("SELECT count(*) as c FROM whatsapp_messages").get();
console.log('Total messages:', msgs.c);

const pushNames = db.prepare("SELECT DISTINCT sender_name, chat_jid, sender_jid FROM whatsapp_messages WHERE sender_name IS NOT NULL AND sender_name != '' LIMIT 20").all();
console.log('Distinct sender_names in messages:', pushNames);

db.close();
