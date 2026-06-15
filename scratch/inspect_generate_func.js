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
 * Temporary Debug Endpoint to inspect woo_feed_generate_feed function
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-generate-func-details', array(
        'methods' => 'GET',
        'callback' => function() {
            $details = array();
            if ( function_exists( 'woo_feed_generate_feed' ) ) {
                $func = new ReflectionFunction( 'woo_feed_generate_feed' );
                $details['woo_feed_generate_feed'] = array(
                    'file' => $func->getFileName(),
                    'start_line' => $func->getStartLine(),
                    'end_line' => $func->getEndLine(),
                    'code' => array_slice( file( $func->getFileName() ), $func->getStartLine() - 1, $func->getEndLine() - $func->getStartLine() + 1 )
                );
            }
            
            // Check for class WooFeedGenerate or any generation hooks
            $classes_to_check = array( 'WooFeedGenerate', 'CTXFeed\\\\V5\\\\API\\\\V1\\\\MakeFeed', 'CTXFeed\\\\V5\\\\Helper\\\\CronHelper' );
            foreach ( $classes_to_check as $class ) {
                if ( class_exists( $class ) ) {
                    $ref = new ReflectionClass( $class );
                    $methods = array();
                    foreach ( $ref->getMethods() as $method ) {
                        $methods[] = $method->getName();
                    }
                    $details[$class] = array(
                        'file' => $ref->getFileName(),
                        'methods' => $methods
                    );
                }
            }

            return new WP_REST_Response( array(
                'success' => true,
                'details' => $details
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Inspect Gen Func',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    console.log('Creating debug snippet...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    
    let snippetId = JSON.parse(createRes.body).id;
    console.log('Snippet created with ID:', snippetId);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Querying debug-generate-func-details...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-generate-func-details', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Details:', JSON.stringify(parsed.details, null, 2));
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
