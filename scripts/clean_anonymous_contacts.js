const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'whatsapp.db');
const db = new Database(dbPath);

console.log('--- Cleaning Anonymous Group LIDs from SQLite database ---');

// 1. Check existing counts
const beforeTotal = db.prepare('SELECT count(*) as c FROM whatsapp_contacts').get().c;
console.log(`Contacts before cleanup: ${beforeTotal}`);

// 2. Identify anonymous LIDs with no proper human name
const badLidContacts = db.prepare(`
  SELECT id, account_id, name, notify_name 
  FROM whatsapp_contacts 
  WHERE id LIKE '%@lid'
`).all();

console.log(`Found ${badLidContacts.length} LID contacts.`);

let deletedCount = 0;
let keptCount = 0;

const deleteStmt = db.prepare('DELETE FROM whatsapp_contacts WHERE id = ?');

for (const c of badLidContacts) {
  const nameHasLetters = c.name && /[a-zA-Z]/.test(c.name) && !c.name.startsWith('Contact (') && !c.name.startsWith('+');
  const notifyHasLetters = c.notify_name && /[a-zA-Z]/.test(c.notify_name) && !c.notify_name.startsWith('Contact (') && !c.notify_name.startsWith('+');

  if (!nameHasLetters && !notifyHasLetters) {
    deleteStmt.run(c.id);
    deletedCount++;
  } else {
    keptCount++;
    console.log(`Preserving authentic contact: id=${c.id}, name="${c.name}", notify="${c.notify_name}"`);
  }
}

console.log(`Deleted ${deletedCount} anonymous LID contacts.`);
console.log(`Preserved ${keptCount} genuine contacts with human names.`);

// 3. Clean any fake direct chats that were created for anonymous LIDs with no message history
const fakeLidChats = db.prepare(`
  SELECT id, account_id, name 
  FROM whatsapp_chats 
  WHERE id LIKE '%@lid' AND (last_message_text IS NULL OR last_message_text = '')
`).all();

const deleteChatStmt = db.prepare('DELETE FROM whatsapp_chats WHERE id = ?');
for (const chat of fakeLidChats) {
  const msgCount = db.prepare('SELECT count(*) as c FROM whatsapp_messages WHERE chat_jid = ?').get(chat.id).c;
  if (msgCount === 0) {
    deleteChatStmt.run(chat.id);
    console.log(`Deleted empty fake chat: ${chat.id}`);
  }
}

const afterTotal = db.prepare('SELECT count(*) as c FROM whatsapp_contacts').get().c;
console.log(`Contacts after cleanup: ${afterTotal}`);

db.close();
console.log('✅ SQLite cleanup complete.');
