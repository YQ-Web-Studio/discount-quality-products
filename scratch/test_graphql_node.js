const https = require('https');
require('dotenv').config({ path: '.env.local' });

const wordpressUrl = process.env.WOOCOMMERCE_URL;

const query = `
query {
  __schema {
    queryType {
      fields {
        name
        description
      }
    }
  }
}
`;

const data = JSON.stringify({ query });

const options = {
  hostname: wordpressUrl.replace('https://', ''),
  port: 443,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  console.log('StatusCode:', res.statusCode);
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(responseData);
        console.log('GraphQL Fields:');
        parsed.data.__schema.queryType.fields.forEach(f => {
          console.log(`- ${f.name}: ${f.description || ''}`);
        });
      } catch (err) {
        console.log('Error parsing response:', err.message);
        console.log('Body:', responseData);
      }
    } else {
      console.log('Response body:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e);
});

req.write(data);
req.end();
