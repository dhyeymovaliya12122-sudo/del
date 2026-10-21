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
    'GHSA-2g4f-4pwh-qvx6', // ajv
    'GHSA-v422-hmwv-36x6', // body-parser
    'GHSA-5v7r-6r5c-r473', // file-type
    'GHSA-j47w-4g3g-c36v', // file-type
    'GHSA-3ppc-4f35-3m26', // minimatch
    'GHSA-7r86-cg39-jmmj', // minimatch
    'GHSA-23c5-xmqv-rm74', // minimatch
    'GHSA-535w-7cp7-47q4', // multer
    'GHSA-3v7f-55p6-f55p', // picomatch
    'GHSA-c2c7-rcm5-vvqj', // picomatch
    'GHSA-4mjr-xmp4-gh2g', // qs
    'GHSA-ph9p-34f9-6g65', // tmp
    'GHSA-w5hq-g745-h8pq', // uuid
    'GHSA-38r7-794h-5758'  // webpack
  ];
  for (const g of ghsas) {
    const data = await getGHSA(g);
    console.log(`${g} (${data.vulnerabilities?.[0]?.package?.name}): patched in ${data.vulnerabilities?.[0]?.first_patched_version}, range: ${data.vulnerabilities?.[0]?.vulnerable_version_range}`);
  }
})();
