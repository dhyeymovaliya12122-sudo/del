const fs = require('fs');

const raw = fs.readFileSync('C:/Users/dhyey/.gemini/antigravity-ide/brain/c97e58e4-6386-43af-8af9-ba2c130d383c/.system_generated/tasks/task-21.log', 'utf8');
const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const jsonStr = raw.substring(firstBrace, lastBrace + 1);

const audit = JSON.parse(jsonStr);
console.log('Metadata vulnerabilities:', audit.metadata.vulnerabilities);
console.log('\nVulnerable Packages:');
for (const [pkg, info] of Object.entries(audit.vulnerabilities)) {
  console.log(`- ${pkg} [${info.severity}] (direct: ${info.isDirect})`);
  console.log(`  Fix: ${JSON.stringify(info.fixAvailable)}`);
  console.log(`  Nodes: ${info.nodes ? info.nodes.join(', ') : 'none'}`);
  console.log(`  Effects: ${info.effects ? info.effects.join(', ') : 'none'}`);
}
