const https = require('https');
require('dotenv').config({ path: '.env.local' });

const wpUser = process.env.WORDPRESS_USER;
const wpPassword = process.env.WORDPRESS_APP_PASSWORD;
const wordpressUrl = process.env.WOOCOMMERCE_URL;

const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

function fetchEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: wordpressUrl.replace('https://', ''),
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ path, statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (e) => {
      resolve({ path, error: e.message });
    });

    req.end();
  });
}

async function run() {
  const endpoints = [
    '/wp-json/wp/v2/settings',
    '/wp-json/wp/v2/plugins',
    '/wp-json/wp/v2/themes',
    '/wp-json/wp/v2/users/me',
  ];

  for (const ep of endpoints) {
    console.log(`Fetching ${ep}...`);
    const res = await fetchEndpoint(ep);
    console.log(`Result for ${ep}: StatusCode = ${res.statusCode}`);
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(res.body);
        console.log('Keys:', Object.keys(parsed));
        if (ep.includes('users/me')) {
          console.log('Me info:', parsed.name, parsed.roles);
        }
        if (ep.includes('settings')) {
          console.log('Settings keys:', Object.keys(parsed));
          console.log('Settings sample:', JSON.stringify(parsed, null, 2).substring(0, 500));
        }
      } catch (err) {
        console.log('JSON Parse Error:', err.message);
      }
    } else {
      console.log('Body snippet:', res.body ? res.body.substring(0, 200) : 'none');
    }
    console.log('----------------------------------------------------');
  }
}

run();
