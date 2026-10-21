const https = require('https');

function getGHSA(id) {
  return new Promise((resolve) => {
    https.get(`https://api.github.com/advisories/${id}`, {
      headers: { 'User-Agent': 'Node.js' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', e => resolve(e.message));
  });
}

(async () => {
  for (const id of ['GHSA-vfj7-8cjw-p6xm', 'GHSA-hp3w-g68c-fv3c']) {
    const adv = await getGHSA(id);
    console.log(`\n=== ${id} ===`);
    console.log('Summary:', adv.summary);
    console.log('Description:', adv.description?.slice(0, 300));
    console.log('Patched versions:', adv.vulnerabilities?.[0]?.first_patched_version);
    console.log('Vulnerable range:', adv.vulnerabilities?.[0]?.vulnerable_version_range);
  }
})();
