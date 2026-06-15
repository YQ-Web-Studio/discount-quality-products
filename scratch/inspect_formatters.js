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
 * Temporary Debug Endpoint to inspect CTX Feed formatters
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-formatters', array(
        'methods' => 'GET',
        'callback' => function() {
            // Find DropDownOptions or WooFeedDropDownOptions class
            $output_types = array();
            if ( class_exists( 'DropDownOptions' ) ) {
                if ( method_exists( 'DropDownOptions', 'output_types' ) ) {
                    $output_types = DropDownOptions::output_types();
                }
            } elseif ( class_exists( 'WooFeedDropDownOptions' ) ) {
                if ( method_exists( 'WooFeedDropDownOptions', 'output_types' ) ) {
                    $output_types = WooFeedDropDownOptions::output_types();
                }
            } else {
                // Try searching for the class files
                $plugin_dir = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce';
                $found_files = array();
                if ( is_dir( $plugin_dir ) ) {
                    $it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $plugin_dir ) );
                    foreach ( $it as $file ) {
                        if ( $file->isFile() && strpos( $file->getFilename(), 'DropDownOptions' ) !== false ) {
                            $found_files[] = $file->getPathname();
                            include_once $file->getPathname();
                        }
                    }
                }
                if ( class_exists( 'DropDownOptions' ) ) {
                    $output_types = DropDownOptions::output_types();
                }
            }

            // Let's locate the output formatter logic file and view its contents
            $formatter_code = '';
            $plugin_dir = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce';
            if ( is_dir( $plugin_dir ) ) {
                $it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $plugin_dir ) );
                foreach ( $it as $file ) {
                    if ( $file->isFile() && ( strpos( $file->getFilename(), 'FormatOutput' ) !== false || strpos( $file->getFilename(), 'OutputFormat' ) !== false ) ) {
                        $formatter_code = file_get_contents( $file->getPathname() );
                        break;
                    }
                }
            }

            return new WP_REST_Response( array(
                'success' => true,
                'output_types' => $output_types,
                'formatter_code_length' => strlen($formatter_code),
                'formatter_code_sample' => substr($formatter_code, 0, 5000)
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Inspect Formatters',
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

    console.log('Querying debug-formatters...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-formatters', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Output Types:', parsed.output_types);
      console.log('Formatter Code Length:', parsed.formatter_code_length);
      console.log('Formatter Code Sample:', parsed.formatter_code_sample);
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
