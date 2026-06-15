const https = require('https');
require('dotenv').config({ path: '.env.local' });

const wpUser = process.env.WORDPRESS_USER;
const wpPassword = process.env.WORDPRESS_APP_PASSWORD;
const wordpressUrl = process.env.WOOCOMMERCE_URL;

const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

function apiRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: wordpressUrl.replace('https://', ''),
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  const snippetCode = `/**
 * Temporary Debug Endpoint 2 for Antigravity
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-db-2', array(
        'methods' => 'GET',
        'callback' => function() {
            global $wpdb;
            
            // Query posts of type adt_product_feed
            $feeds = $wpdb->get_results(
                "SELECT * FROM {$wpdb->posts} WHERE post_type = 'adt_product_feed'"
            );
            
            // Query postmeta for these feeds
            $feed_meta = array();
            foreach ($feeds as $feed) {
                $meta = $wpdb->get_results($wpdb->prepare(
                    "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d",
                    $feed->ID
                ));
                
                $unserialized_meta = array();
                foreach ($meta as $m) {
                    $val = $m->meta_value;
                    if (is_serialized($val)) {
                        $unserialized_meta[$m->meta_key] = maybe_unserialize($val);
                    } else {
                        $unserialized_meta[$m->meta_key] = $val;
                    }
                }
                
                $feed_meta[$feed->ID] = $unserialized_meta;
            }

            return new WP_REST_Response( array(
                'success' => true,
                'feeds' => $feeds,
                'feed_meta' => $feed_meta
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Debug Endpoint 2',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    // 1. Create and activate the snippet
    console.log('Creating debug snippet 2...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    console.log('Create Status:', createRes.statusCode);
    
    let snippetId = null;
    try {
      const created = JSON.parse(createRes.body);
      snippetId = created.id;
      console.log('Created Snippet ID:', snippetId);
    } catch (e) {
      console.log('Error parsing created response:', e.message);
      console.log('Response body:', createRes.body);
      return;
    }

    if (!snippetId) {
      console.log('Failed to retrieve snippet ID.');
      return;
    }

    // Wait a brief moment
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Query endpoint
    console.log('Querying debug-db-2 endpoint...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-db-2', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      console.log('Saving debug data to scratch/debug_output_2.json...');
      const fs = require('fs');
      fs.writeFileSync('scratch/debug_output_2.json', queryRes.body);
      console.log('Data saved successfully!');
    } else {
      console.log('Query failed:', queryRes.body);
    }

    // 3. Delete the debug snippet
    console.log(`Deleting debug snippet ${snippetId}...`);
    const deleteRes = await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Delete Status:', deleteRes.statusCode);

  } catch (error) {
    console.error('Error during execution:', error);
  }
}

run();
