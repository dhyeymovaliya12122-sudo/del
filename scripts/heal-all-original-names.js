const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

console.log('=== HEALING ORIGINAL CONTACT AND CHAT NAMES ===');

// 1. Dynamically sync self-contacts and self-chats to their account owner display names
const accounts = db.prepare(`SELECT id, phone_number, display_name FROM whatsapp_accounts`).all();
for (const acc of accounts) {
  if (acc.phone_number && acc.display_name) {
    const cleanDigits = acc.phone_number.replace(/\D/g, '');
    const selfJid = `${cleanDigits}@s.whatsapp.net`;
    db.prepare(`
      UPDATE whatsapp_contacts 
      SET name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE (id = ? OR id LIKE ?) AND (name IS NULL OR name = '' OR name = 'You (Message yourself)')
    `).run(acc.display_name, selfJid, `%${cleanDigits}%`);

    db.prepare(`
      UPDATE whatsapp_chats 
      SET name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE (id = ? OR id LIKE ?) AND (name IS NULL OR name = '' OR name = 'You (Message yourself)')
    `).run(acc.display_name, selfJid, `%${cleanDigits}%`);
  }
}
console.log(`Synced ${accounts.length} account self-identities dynamically`);

// 2. Remove any other occurrences of the 15 forbidden placeholders across whatsapp_contacts
const forbidden = [
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
];

for (const p of forbidden) {
  db.prepare(`
    UPDATE whatsapp_contacts 
    SET name = phone_number 
    WHERE LOWER(TRIM(name)) = ?
  `).run(p);
}

console.log('✅ Database contact healing complete');
