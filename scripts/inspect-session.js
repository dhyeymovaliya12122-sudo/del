const fs = require('fs');
const path = require('path');
const sessionsDir = path.join(__dirname, '../data/sessions');
const dirs = fs.readdirSync(sessionsDir).filter(d => fs.statSync(path.join(sessionsDir, d)).isDirectory());

for (const d of dirs) {
  const credsPath = path.join(sessionsDir, d, 'creds.json');
  if (fs.existsSync(credsPath)) {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    console.log(`Session [${d}]:`, creds.me);
  } else {
    console.log(`Session [${d}]: no creds.json`);
  }
}
