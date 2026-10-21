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
  const adv = await getGHSA('GHSA-36xv-jgw5-4q75');
  console.log(JSON.stringify(adv, null, 2));
})();
