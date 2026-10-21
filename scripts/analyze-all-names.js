const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

console.log('=== ANALYZE CHATS AND THEIR ORIGINAL CONTACT NAMES ===');
const chats = db.prepare('SELECT id, account_id, name, is_group FROM whatsapp_chats').all();
console.log('Total chats:', chats.length);

let phoneAsNameCount = 0;
let groupCount = 0;
let humanNameCount = 0;
let placeholderCount = 0;

const needsOriginalName = [];

for (const chat of chats) {
  const isGrp = !!chat.is_group;
  const name = chat.name || '';

  // Check if name is or contains placeholder
  const lower = name.toLowerCase().trim();
  const isPlaceholder = [
    'whatsapp group',
    'whatsapp user',
    'whatsapp contact',
    'whatsapp channel',
    'direct chat',
    'you',
    'you (message yourself)',
    'unknown contact',
    'unknown user',
    'unknown',
    'group chat',
    'null',
    'undefined',
    'nan',
    '[object object]'
  ].includes(lower) || lower.startsWith('user …') || lower.startsWith('group (');

  if (isPlaceholder) {
    placeholderCount++;
  }

  // Check if name is formatted or raw phone number
  const isPhone = /^\+?\d[\d\s\-()]{6,}$/.test(name);
  if (isPhone) {
    phoneAsNameCount++;
  } else if (isGrp) {
    groupCount++;
  } else {
    humanNameCount++;
  }

  // Check if there is a contact or message with a REAL name for this chat
  const cleanDigits = chat.id.split('@')[0].replace(/\D/g, '');
  const matchedContact = db.prepare(
    "SELECT * FROM whatsapp_contacts WHERE id = ? OR phone_number LIKE ? OR id LIKE ? LIMIT 1"
  ).get(chat.id, `%${cleanDigits}%`, `%${cleanDigits}%`);

  const matchedMessage = db.prepare(
    "SELECT sender_name, text FROM whatsapp_messages WHERE chat_jid = ? AND sender_name IS NOT NULL AND sender_name != '' AND sender_name != 'Direct Chat' LIMIT 1"
  ).get(chat.id);

  if (isPlaceholder || isPhone || !name) {
    needsOriginalName.push({
      chatId: chat.id,
      accountId: chat.account_id,
      currentName: name,
      isGroup: isGrp,
      contactName: matchedContact?.name,
      contactNotify: matchedContact?.notify_name,
      msgSenderName: matchedMessage?.sender_name,
    });
  }
}

console.log('Stats:');
console.log('- Total chats:', chats.length);
console.log('- Human names:', humanNameCount);
console.log('- Groups:', groupCount);
console.log('- Phone as names:', phoneAsNameCount);
console.log('- Placeholders:', placeholderCount);

console.log('\nSample chats that have placeholder or phone as name (first 20):');
console.log(needsOriginalName.slice(0, 20));
