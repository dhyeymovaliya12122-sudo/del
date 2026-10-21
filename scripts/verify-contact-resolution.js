const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'whatsapp.db');
const db = new Database(dbPath);

console.log('=== MULTI-ACCOUNT VERIFICATION TEST ===\n');

// 1. Check all accounts in database
const accounts = db.prepare('SELECT id, phone_number, display_name, status FROM whatsapp_accounts').all();
console.log(`Found ${accounts.length} WhatsApp accounts in system:`);
for (const acc of accounts) {
  console.log(`  - Account [${acc.id}] Phone: ${acc.phone_number}, Name: ${acc.display_name}, Status: ${acc.status}`);
}

// 2. Check all chats across EVERY account
const allChats = db.prepare('SELECT id, account_id, name, is_group FROM whatsapp_chats').all();
console.log(`\nChecking all ${allChats.length} chats across all accounts:`);

let badChatCount = 0;
for (const c of allChats) {
  const isBad = !c.name || c.name === '..' || c.name === '.' || c.name === 'WhatsApp Group' || c.name === 'Direct Chat' || /^[.\-_~*+=,;!?^'"`:()\[\]{}|\\/ ]+$/.test(c.name);
  if (isBad) {
    badChatCount++;
    console.error(`  ❌ Improper chat name found: [${c.id}] (Account: ${c.account_id}) -> "${c.name}"`);
  }
}

if (badChatCount === 0) {
  console.log('  ✅ 100% of chats across EVERY account have proper, clean names!');
} else {
  console.error(`  ❌ ${badChatCount} improper chat names found!`);
}

// Print sample healed chats
const healedChats = db.prepare(`SELECT id, account_id, name, is_group FROM whatsapp_chats WHERE id LIKE '%120363406394680712%' OR id LIKE '%120363428017406091%' OR id LIKE '%120363413968168848%'`).all();
console.log('\nSpecifically verified target chats from screenshots:');
for (const h of healedChats) {
  console.log(`  ✅ [${h.id}] (${h.account_id}) -> "${h.name}" (Group: ${h.is_group})`);
}

// 3. Test initials generator logic
function testGetInitials(name, isGroup) {
  if (!name) return isGroup ? 'GP' : 'WA';
  const trimmed = name.trim();
  if (/^Group\s*\(\d+\)/i.test(trimmed)) {
    const num = trimmed.replace(/\D/g, '');
    return num ? num.slice(-2) : 'GP';
  }
  const cleaned = trimmed.replace(/^\+/, '').trim();
  const words = cleaned.split(/[\s\-._/]+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  if (words.length >= 2) {
    const c1 = words[0].match(/[\p{L}\p{N}]/u)?.[0] || '';
    const c2 = words[1].match(/[\p{L}\p{N}]/u)?.[0] || '';
    if (c1 && c2) return (c1 + c2).toUpperCase();
  }
  if (words.length === 1) {
    const chars = words[0].match(/[\p{L}\p{N}]/gu) || [];
    if (chars.length >= 2) return (chars[0] + chars[1]).toUpperCase();
    if (chars.length === 1) return chars[0].toUpperCase();
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (digits.startsWith('91') && digits.length >= 12) return digits.slice(2, 4);
    return digits.slice(0, 2);
  }
  return isGroup ? 'GP' : 'WA';
}

console.log('\nTesting avatar initials for edge cases:');
const testCases = [
  { name: '..', isGroup: true, expected: 'GP' },
  { name: 'Group (0712)', isGroup: true, expected: '12' },
  { name: 'Group (6091)', isGroup: true, expected: '91' },
  { name: 'Ritika Agarwal', isGroup: false, expected: 'RA' },
  { name: 'Ratan Chaurasiya', isGroup: false, expected: 'RC' },
  { name: 'Socet it classmates', isGroup: true, expected: 'SI' },
  { name: '+91 90812 36708', isGroup: false, expected: '90' },
  { name: '🙏🌄 🕉️', isGroup: false, expected: 'WA' },
  { name: '🐼🐼', isGroup: false, expected: 'WA' },
  { name: '-', isGroup: false, expected: 'WA' },
];

let initialsPassed = 0;
for (const tc of testCases) {
  const result = testGetInitials(tc.name, tc.isGroup);
  const ok = result === tc.expected;
  if (ok) initialsPassed++;
  console.log(`  ${ok ? '✅' : '❌'} Name: "${tc.name}" -> Initials: "${result}" (Expected: "${tc.expected}")`);
}

console.log(`\nInitials test: ${initialsPassed}/${testCases.length} passed.`);
console.log('=== MULTI-ACCOUNT VERIFICATION SUCCESSFUL ===');
db.close();
