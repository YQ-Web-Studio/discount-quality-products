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
 * Temporary Debug Endpoint to read PHP error logs
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-php-log', array(
        'methods' => 'GET',
        'callback' => function() {
            $log_files = array();
            
            // 1. Check ini error_log
            $ini_log = ini_get('error_log');
            if ( $ini_log ) {
                $log_files['ini_log'] = $ini_log;
            }
            
            // 2. Check standard WP debug log
            if ( defined('WP_CONTENT_DIR') ) {
                $wp_log = WP_CONTENT_DIR . '/debug.log';
                if ( file_exists($wp_log) ) {
                    $log_files['wp_log'] = $wp_log;
                }
            }
            
            // 3. Check ABSPATH error_log
            $abs_log = ABSPATH . 'error_log';
            if ( file_exists($abs_log) ) {
                $log_files['abs_log'] = $abs_log;
            }

            $results = array();
            foreach ( $log_files as $key => $file ) {
                if ( file_exists( $file ) && is_readable( $file ) ) {
                    $content = file( $file );
                    $results[$key] = array(
                        'path' => $file,
                        'size' => filesize($file),
                        'last_lines' => array_slice( $content, -25 )
                    );
                } else {
                    $results[$key] = array(
                        'path' => $file,
                        'exists' => file_exists($file),
                        'readable' => is_readable($file)
                    );
                }
            }

            return new WP_REST_Response( array(
                'success' => true,
                'results' => $results
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Read Error Log',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    console.log('Creating debug snippet...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    
    let snippetId = JSON.parse(createRes.body).id;
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Querying debug-php-log...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-php-log', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Logs results:', JSON.stringify(parsed.results, null, 2));
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
