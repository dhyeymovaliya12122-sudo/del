const fs = require('fs');

const raw = fs.readFileSync('C:/Users/dhyey/.gemini/antigravity-ide/brain/c97e58e4-6386-43af-8af9-ba2c130d383c/.system_generated/tasks/task-21.log', 'utf8');
const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const jsonStr = raw.substring(firstBrace, lastBrace + 1);

const audit = JSON.parse(jsonStr);

console.log('=== VULNERABILITIES SUMMARY ===');
console.log(JSON.stringify(audit.metadata.vulnerabilities, null, 2));

console.log('\n=== DETAILS BY PACKAGE ===');
for (const [pkg, info] of Object.entries(audit.vulnerabilities)) {
  const viaList = info.via.map(v => typeof v === 'string' ? `dep:${v}` : `${v.title} (range: ${v.range})`);
  console.log(`\nPackage: ${pkg} [${info.severity}] (Direct: ${info.isDirect})`);
  console.log(`  Nodes: ${info.nodes.join(' | ')}`);
  console.log(`  Via:`);
  viaList.forEach(v => console.log(`    - ${v}`));
}
