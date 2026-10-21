const fs = require('fs');
const raw = fs.readFileSync('C:/Users/dhyey/.gemini/antigravity-ide/brain/c97e58e4-6386-43af-8af9-ba2c130d383c/.system_generated/tasks/task-21.log', 'utf8');
const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const audit = JSON.parse(raw.substring(firstBrace, lastBrace + 1));

console.log('BRACES:', JSON.stringify(audit.vulnerabilities['braces'], null, 2));
console.log('SPRINTF-JS:', JSON.stringify(audit.vulnerabilities['sprintf-js'], null, 2));
