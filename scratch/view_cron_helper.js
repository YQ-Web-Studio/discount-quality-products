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
 * Temporary Debug Endpoint 9 (Read cron-helper.php)
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-db-9', array(
        'methods' => 'GET',
        'callback' => function() {
            $cron_helper = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce/includes/cron-helper.php';
            if (!file_exists($cron_helper)) {
                return new WP_REST_Response(array('error' => 'File not found'), 404);
            }
            $content = file_get_contents($cron_helper);
            $lines = explode("\\n", $content);
            
            // Find where woo_feed_cron_update_single_feed is defined
            $start = 0;
            foreach ($lines as $num => $line) {
                if (str_contains($line, 'function woo_feed_cron_update_single_feed')) {
                    $start = $num;
                    break;
                }
            }
            
            $snippet = array_slice($lines, max(0, $start - 10), 80);
            return new WP_REST_Response( array(
                'success' => true,
                'start_line' => $start,
                'code' => implode("\\n", $snippet)
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Debug Endpoint 9',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    console.log('Creating debug snippet 9...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    
    let snippetId = JSON.parse(createRes.body).id;
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Querying debug-db-9...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-db-9', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Code definition:\n', parsed.code);
    }

    await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
