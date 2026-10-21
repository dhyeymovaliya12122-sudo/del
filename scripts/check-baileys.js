const http = require('http');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          resolve({ raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          resolve({ raw: buf });
        }
      });
    }).on('error', reject);
  });
}

async function check() {
  console.log('=== CHECKING BAILEYS STATUS VIA API ===');
  const accounts = await get('http://localhost:3000/api/v1/accounts');
  console.log('Accounts API:', accounts);

  // Check sync status or session status
  const sessionStatus = await get('http://localhost:3000/api/v1/session/status?accountId=ba7a9a17-07d0-44f6-9f38-324b5a779e8f');
  console.log('Session status for ketan:', sessionStatus);
}

check().catch(console.error);
