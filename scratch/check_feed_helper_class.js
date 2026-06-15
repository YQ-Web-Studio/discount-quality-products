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
 * Temporary Debug Endpoint to find FeedHelper FQCN
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-helper-fqcn', array(
        'methods' => 'GET',
        'callback' => function() {
            $classes = array(
                'CTXFeed\\\\V5\\\\API\\\\V1\\\\FeedHelper' => class_exists('CTXFeed\\\\V5\\\\API\\\\V1\\\\FeedHelper'),
                'CTXFeed\\\\V5\\\\Helper\\\\FeedHelper' => class_exists('CTXFeed\\\\V5\\\\Helper\\\\FeedHelper'),
                'CTXFeed\\\\V5\\\\Utility\\\\FeedHelper' => class_exists('CTXFeed\\\\V5\\\\Utility\\\\FeedHelper'),
                'FeedHelper' => class_exists('FeedHelper')
            );
            
            // Also let's list imports of MakeFeed.php by reading first 30 lines
            $file_path = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce/V5/API/V1/MakeFeed.php';
            $imports = array();
            if ( file_exists( $file_path ) ) {
                $lines = file( $file_path );
                $imports = array_slice( $lines, 0, 30 );
            }

            return new WP_REST_Response( array(
                'success' => true,
                'classes' => $classes,
                'imports' => $imports
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Find FeedHelper FQCN',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    console.log('Creating debug snippet...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    
    let snippetId = JSON.parse(createRes.body).id;
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Querying debug-helper-fqcn...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-helper-fqcn', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Classes:', parsed.classes);
      console.log('Imports:\n', parsed.imports.join(''));
    } else {
      console.log('Query response:', queryRes.body);
    }

    console.log('Deleting snippet...');
    await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
