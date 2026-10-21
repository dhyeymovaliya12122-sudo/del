const fs = require('fs');

const raw = fs.readFileSync('C:/Users/dhyey/.gemini/antigravity-ide/brain/c97e58e4-6386-43af-8af9-ba2c130d383c/.system_generated/tasks/task-21.log', 'utf8');
const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const audit = JSON.parse(raw.substring(firstBrace, lastBrace + 1));

console.log('--- DIRECT SOURCE PACKAGES (vulnerabilities not caused solely by other dependencies) ---');
const sources = {};
for (const [pkg, info] of Object.entries(audit.vulnerabilities)) {
  const directAdvisories = info.via.filter(v => typeof v !== 'string');
  if (directAdvisories.length > 0) {
    sources[pkg] = directAdvisories.map(a => ({
      title: a.title,
      range: a.range,
      severity: a.severity,
      url: a.url
    }));
  }
}
console.log(JSON.stringify(sources, null, 2));
