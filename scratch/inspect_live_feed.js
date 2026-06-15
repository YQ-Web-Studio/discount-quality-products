const https = require('https');

const url = 'https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml';

https.get(url, (res) => {
  console.log('StatusCode:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    if (data.length > 5000) {
      console.log('Sample of XML Feed Content:\n', data.substring(0, 2000));
      res.destroy(); // Stop reading
    }
  });
}).on('error', (e) => {
  console.error(e);
});
