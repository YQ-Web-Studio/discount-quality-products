const https = require('https');

function gqlQuery(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const options = {
      hostname: 'admin.discountproducts.co.uk',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Non-JSON: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  // Test 1: list published posts
  console.log('\n=== Test 1: List published posts ===');
  const list = await gqlQuery(`
    query {
      posts(first: 5, where: { status: PUBLISH }) {
        nodes { id slug title status }
      }
    }
  `);
  console.log(JSON.stringify(list, null, 2));

  // Test 2: fetch by slug (our exact query)
  const testSlug = 'mr16-vs-gu10-spotlight-guide';
  console.log('\n=== Test 2: getPostBySlug with idType: SLUG ===');
  const bySlug = await gqlQuery(`
    query GetPostBySlug($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        id slug title date modified
        author { node { name } }
        content excerpt
      }
    }
  `, { slug: testSlug });
  console.log(JSON.stringify(bySlug, null, 2));

  // Test 3: try without authentication (public posts)
  console.log('\n=== Test 3: getPosts listing ===');
  const posts2 = await gqlQuery(`
    query GetPosts($first: Int) {
      posts(first: $first, where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }) {
        pageInfo { hasNextPage endCursor }
        nodes { id slug title excerpt date }
      }
    }
  `, { first: 5 });
  console.log(JSON.stringify(posts2, null, 2));
}

run().catch(console.error);
