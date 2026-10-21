const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'whatsapp.db');
const db = new Database(dbPath);

console.log('--- Inspecting WhatsApp Database at', dbPath);

const chatCols = db.prepare(`PRAGMA table_info(whatsapp_chats)`).all();
console.log('whatsapp_chats columns:', chatCols.map(c => c.name));

const accountIdCol = chatCols.some(c => c.name === 'accountId') ? 'accountId' : 'account_id';
const isGroupCol = chatCols.some(c => c.name === 'isGroup') ? 'isGroup' : 'is_group';

// 1. Inspect improper chat names
const badChats = db.prepare(`
  SELECT id, ${accountIdCol} AS accountId, name, ${isGroupCol} AS isGroup 
  FROM whatsapp_chats 
  WHERE name = '..' OR name = 'WhatsApp Group' OR name = '.' OR name IS NULL OR name = '' OR name = 'Direct Chat'
`).all();

console.log(`Found ${badChats.length} chats with improper names:`);
for (const chat of badChats) {
  console.log(`  [Chat] id: ${chat.id}, account: ${chat.accountId}, current name: "${chat.name}", isGroup: ${chat.isGroup}`);
}

// Heal bad chats
const updateChatStmt = db.prepare(`UPDATE whatsapp_chats SET name = ? WHERE id = ? AND ${accountIdCol} = ?`);
for (const chat of badChats) {
  let newName = '';
  if (chat.isGroup) {
    const rawDigits = chat.id.split('@')[0].replace(/\D/g, '');
    const suffix = rawDigits.length >= 4 ? rawDigits.slice(-4) : rawDigits;
    newName = suffix ? `Group (${suffix})` : 'Group Chat';
  } else {
    const rawDigits = chat.id.split('@')[0].replace(/\D/g, '');
    if (rawDigits.length >= 10) {
      if (rawDigits.startsWith('91') && rawDigits.length === 12) {
        newName = `+91 ${rawDigits.slice(2, 7)} ${rawDigits.slice(7)}`;
      } else {
        newName = `+${rawDigits}`;
      }
    } else {
      newName = chat.id.split('@')[0];
    }
  }
  updateChatStmt.run(newName, chat.id, chat.accountId);
  console.log(`  -> Healed chat ${chat.id} (${chat.accountId}) -> "${newName}"`);
}

// 2. Inspect improper contact names
const contactCols = db.prepare(`PRAGMA table_info(whatsapp_contacts)`).all();
const contactAccountCol = contactCols.some(c => c.name === 'accountId') ? 'accountId' : 'account_id';
const phoneCol = contactCols.some(c => c.name === 'phoneNumber') ? 'phoneNumber' : 'phone_number';

const badContacts = db.prepare(`
  SELECT id, ${contactAccountCol} AS accountId, name 
  FROM whatsapp_contacts 
  WHERE name = '..' OR name = 'WhatsApp Group' OR name = '.' OR name = 'Direct Chat' OR name LIKE '+%' OR name LIKE 'Contact (%'
`).all();

console.log(`Found ${badContacts.length} contacts with improper names:`);
const deleteBadContactStmt = db.prepare(`DELETE FROM whatsapp_contacts WHERE id = ? AND ${contactAccountCol} = ?`);
const updateContactStmt = db.prepare(`UPDATE whatsapp_contacts SET name = ? WHERE id = ? AND ${contactAccountCol} = ?`);
for (const contact of badContacts) {
  const isLid = contact.id.endsWith('@lid') || /^\d{14,16}$/.test(contact.id.split('@')[0]);
  if (isLid) {
    deleteBadContactStmt.run(contact.id, contact.accountId);
    console.log(`  -> Removed anonymous LID contact ${contact.id} (${contact.accountId})`);
    continue;
  }
  const cleanDigits = contact.id.split('@')[0].replace(/\D/g, '');
  let newName = '';
  if (cleanDigits.length >= 10) {
    if (cleanDigits.startsWith('91') && cleanDigits.length === 12) {
      newName = `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`;
    } else {
      newName = `+${cleanDigits}`;
    }
  } else {
    newName = contact.id.split('@')[0];
  }
  updateContactStmt.run(newName, contact.id, contact.accountId);
  console.log(`  -> Healed contact ${contact.id} (${contact.accountId}) -> "${newName}"`);
}

// 3. Verify
const remaining = db.prepare(`
  SELECT id, ${accountIdCol} AS accountId, name FROM whatsapp_chats 
  WHERE name = '..' OR name = 'WhatsApp Group' OR name = '.'
`).all();
console.log(`Verification: Remaining bad chats = ${remaining.length}`);
console.log('✅ SQLite Database self-healing complete!');
db.close();
