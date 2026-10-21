const fs = require('fs');
const path = require('path');

const sessionDir = path.join(__dirname, '../data/sessions/ba7a9a17-07d0-44f6-9f38-324b5a779e8f');
const files = fs.readdirSync(sessionDir);

let found = [];
for (const file of files) {
  if (file.endsWith('.json')) {
    const content = fs.readFileSync(path.join(sessionDir, file), 'utf8');
    if (content.includes('120363406394680712') || content.includes('120363428017406091')) {
      found.push(file);
    }
  }
}
console.log('Session files mentioning these groups:', found);
