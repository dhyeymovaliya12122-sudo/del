const fs = require('fs');

const raw = fs.readFileSync('C:/Users/dhyey/.gemini/antigravity-ide/brain/c97e58e4-6386-43af-8af9-ba2c130d383c/.system_generated/tasks/task-21.log', 'utf8');
const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const audit = JSON.parse(raw.substring(firstBrace, lastBrace + 1));

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

// Find paths from root for each node in audit
const rootPkgsWithVulns = new Map();

for (const [pkg, info] of Object.entries(audit.vulnerabilities)) {
  const nodes = info.nodes || [];
  for (const node of nodes) {
    // node is e.g. "node_modules/picomatch" or "node_modules/external-editor/node_modules/tmp"
    // Find which direct package pulled this in
    const parts = node.split('/node_modules/');
    const directDep = parts[0].replace(/^node_modules\//, '');
    if (!rootPkgsWithVulns.has(directDep)) {
      rootPkgsWithVulns.set(directDep, new Set());
    }
    rootPkgsWithVulns.get(directDep).add(`${pkg} (${info.severity})`);
  }
}

console.log('=== DIRECT DEPENDENCIES PULLING VULNERABILITIES ===');
for (const [dep, vulns] of rootPkgsWithVulns.entries()) {
  console.log(`\nDirect Dep: ${dep}`);
  for (const v of vulns) {
    console.log(`  - ${v}`);
  }
}
