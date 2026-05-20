const http = require('http');

http.get('http://discount-products-backend.local/wp-json/custom/v1/create-setup-intent', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
