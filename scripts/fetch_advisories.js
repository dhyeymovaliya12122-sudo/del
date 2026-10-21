const https = require('https');

function getGHSA(id) {
  return new Promise((resolve) => {
    https.get(`https://api.github.com/advisories/${id}`, {
      headers: { 'User-Agent': 'Node.js' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', e => resolve(e.message));
  });
}

(async () => {
  const ghsas = [
    'GHSA-vfj7-8cjw-p6xm', // braces
    'GHSA-hp3w-g68c-fv3c', // sprintf-js
    'GHSA-36xv-jgw5-4q75', // @nestjs/core
    'GHSA-r5fr-rjxr-66jc', // lodash
    'GHSA-5j98-mcp5-4vw2'  // glob
  ];
  for (const g of ghsas) {
    const data = await getGHSA(g);
    console.log(`\n=== ${g} ===`);
    console.log('Summary:', data.summary);
    console.log('Severity:', data.severity);
    console.log('Vulnerabilities:', data.vulnerabilities?.map(v => ({
      package: v.package.name,
      vulnerable_version_range: v.vulnerable_version_range,
      first_patched_version: v.first_patched_version
    })));
  }
})();
