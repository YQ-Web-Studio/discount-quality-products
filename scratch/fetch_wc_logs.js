const https = require('https');
require('dotenv').config({ path: '.env.local' });

const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
const wordpressUrl = process.env.WOOCOMMERCE_URL;

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

const options = {
  hostname: wordpressUrl.replace('https://', ''),
  port: 443,
  path: '/wp-json/wc/v3/system_status/logs',
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  console.log('StatusCode:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const logs = JSON.parse(data);
        console.log(`Success! Found ${logs.length} log files:`);
        logs.forEach(log => {
          console.log(`- ID: ${log.id} | File: ${log.title} | Date: ${log.date_created}`);
        });
      } catch (err) {
        console.log('Error parsing JSON:', err.message);
      }
    } else {
      console.log('Response body:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e);
});

req.end();
