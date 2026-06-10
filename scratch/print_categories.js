const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const url = process.env.WOOCOMMERCE_URL;
const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

console.log('Credentials:', { url, consumerKey: !!consumerKey, consumerSecret: !!consumerSecret });

const apiUrl = `${url.replace(/\/$/, "")}/wp-json/wc/v3/products/categories?per_page=100`;
const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

fetch(apiUrl, {
  headers: {
    Authorization: `Basic ${authString}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(cats => {
  cats.forEach(c => {
    console.log(`id: ${c.id}, name: "${c.name}", slug: "${c.slug}", parent: ${c.parent}`);
  });
})
.catch(err => console.error(err));
