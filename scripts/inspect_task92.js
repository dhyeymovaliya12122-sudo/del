const fs = require('fs');

const raw = fs.readFileSync('C:/Users/dhyey/.gemini/antigravity-ide/brain/c97e58e4-6386-43af-8af9-ba2c130d383c/.system_generated/tasks/task-92.log', 'utf8');
console.log('Task 92 log end:');
console.log(raw.slice(-1500));
