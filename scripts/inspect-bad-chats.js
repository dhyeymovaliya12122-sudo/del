const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/whatsapp.db'));

const chats = db.prepare('SELECT * FROM whatsapp_chats').all();
const badChats = chats.filter(c => {
  const n = (c.name || '').trim().toLowerCase();
  return (
    !n ||
    n === 'you' ||
    n === 'you (message yourself)' ||
    n === 'whatsapp group' ||
    n === 'whatsapp user' ||
    n === 'whatsapp contact' ||
    n === 'whatsapp channel' ||
    n === 'direct chat' ||
    n === 'unknown' ||
    n === 'unknown contact' ||
    n === 'unknown user' ||
    n === 'group chat' ||
    n === 'null' ||
    n === 'undefined' ||
    n === 'nan' ||
    n === '[object object]' ||
    n === '..' ||
    n === '.'
  );
});

console.log('Bad chats in whatsapp_chats:', badChats.length);
console.log(badChats);
