const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

const contacts = db.prepare('SELECT * FROM whatsapp_contacts').all();
const badContacts = contacts.filter(c => {
  const n = (c.name || '').trim().toLowerCase();
  const noti = (c.notify_name || '').trim().toLowerCase();
  return (
    !n ||
    n === 'you' ||
    n === 'you (message yourself)' ||
    n === 'whatsapp user' ||
    n === 'whatsapp contact' ||
    n === 'direct chat' ||
    n === 'unknown' ||
    n === 'unknown contact' ||
    n === 'unknown user' ||
    n === 'null' ||
    n === 'undefined' ||
    n === 'nan' ||
    n === '[object object]' ||
    n === '..' ||
    n === '.'
  );
});

console.log('Bad contacts in whatsapp_contacts:', badContacts.length);
console.log(badContacts);
