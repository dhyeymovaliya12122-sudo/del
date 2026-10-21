const http = require('http');

http.get('http://127.0.0.1:3000/api/v1/accounts', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Accounts:', JSON.parse(data));
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
