const fs = require('fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

function findDependents(target) {
  const result = [];
  for (const [name, pkg] of Object.entries(lock.packages)) {
    if (pkg.dependencies && pkg.dependencies[target]) {
      result.push({ dependent: name, version: pkg.dependencies[target] });
    }
    if (pkg.devDependencies && pkg.devDependencies[target]) {
      result.push({ dependent: name, version: pkg.devDependencies[target], dev: true });
    }
  }
  return result;
}

console.log('Who depends on braces?');
console.log(findDependents('braces'));

console.log('\nWho depends on micromatch?');
console.log(findDependents('micromatch'));

console.log('\nWho depends on sprintf-js?');
console.log(findDependents('sprintf-js'));
