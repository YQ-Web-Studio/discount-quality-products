const https = require('https');
require('dotenv').config({ path: '.env.local' });

const wpUser = process.env.WORDPRESS_USER;
const wpPassword = process.env.WORDPRESS_APP_PASSWORD;
const wordpressUrl = process.env.WOOCOMMERCE_URL;

const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

// Helper to make https requests
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
 * Temporary Debug Endpoint for Antigravity
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-db', array(
        'methods' => 'GET',
        'callback' => function() {
            global $wpdb;
            
            // Query options related to CTX Feed (woo-feed)
            $woo_feed_options = $wpdb->get_results(
                "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE '%woo_feed%' OR option_name LIKE '%webappick%'"
            );
            
            // Also let's check for any active filters hooked into CTX Feed
            // We can check the global $wp_filter array
            global $wp_filter;
            $feed_filters = array();
            if (isset($wp_filter)) {
                foreach ($wp_filter as $hook_name => $hook_object) {
                    if (str_contains($hook_name, 'woo_feed') || str_contains($hook_name, 'ctx_feed')) {
                        $feed_filters[$hook_name] = array();
                        foreach ($hook_object->callbacks as $priority => $callbacks) {
                            foreach ($callbacks as $idx => $callback_data) {
                                $feed_filters[$hook_name][] = array(
                                    'priority' => $priority,
                                    'function' => is_string($callback_data['function']) ? $callback_data['function'] : 'Closure/Object'
                                );
                            }
                        }
                    }
                }
            }

            return new WP_REST_Response( array(
                'success' => true,
                'woo_feed_options' => $woo_feed_options,
                'feed_filters' => $feed_filters
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Debug Endpoint',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    // 1. Create and activate the snippet
    console.log('Creating debug snippet...');
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

    // Wait a brief moment for the endpoint to register
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Query our newly created endpoint
    console.log('Querying custom debug endpoint...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-db', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      console.log('Saving debug data to scratch/debug_output.json...');
      const fs = require('fs');
      fs.writeFileSync('scratch/debug_output.json', queryRes.body);
      console.log('Data saved successfully!');
    } else {
      console.log('Query failed:', queryRes.body);
    }

    // 3. Delete the debug snippet to clean up
    console.log(`Deleting debug snippet ${snippetId}...`);
    const deleteRes = await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Delete Status:', deleteRes.statusCode);

  } catch (error) {
    console.error('Error during execution:', error);
  }
}

run();
