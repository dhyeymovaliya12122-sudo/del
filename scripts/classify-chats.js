const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

const chats = db.prepare('SELECT id, name, is_group, unread_count FROM whatsapp_chats').all();
console.log('Total chats:', chats.length);

const grouped = {
  human: [],
  groups: [],
  phones: [],
  placeholders: []
};

for (const c of chats) {
  const n = (c.name || '').trim();
  const lower = n.toLowerCase();
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
  ].includes(lower) || n === '..' || n === '.' || lower.startsWith('group (') || lower.startsWith('user …');

  if (isPlaceholder) {
    grouped.placeholders.push(c);
  } else if (/^\+?\d[\d\s\-()]{6,}$/.test(n)) {
    grouped.phones.push(c);
  } else if (c.is_group) {
    grouped.groups.push(c);
  } else {
    grouped.human.push(c);
  }
}

console.log('Human names count:', grouped.human.length);
console.log('Groups count:', grouped.groups.length);
console.log('Phones count:', grouped.phones.length);
console.log('Placeholders count:', grouped.placeholders.length);
console.log('\nPlaceholders:', grouped.placeholders);
console.log('\nPhones sample:', grouped.phones.slice(0, 10));
