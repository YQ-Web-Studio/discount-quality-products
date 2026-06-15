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
 * Temporary Debug Endpoint to find feed generation functions
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-generation-funcs', array(
        'methods' => 'GET',
        'callback' => function() {
            // Find files in plugin dir containing "generate" or "rebuild"
            $plugin_dir = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce';
            $files_with_generate = array();
            if ( is_dir( $plugin_dir ) ) {
                $it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $plugin_dir ) );
                foreach ( $it as $file ) {
                    if ( $file->isFile() && $file->getExtension() === 'php' ) {
                        $filename = $file->getFilename();
                        if ( stripos( $filename, 'generate' ) !== false || stripos( $filename, 'rebuild' ) !== false || stripos( $filename, 'cron' ) !== false || stripos( $filename, 'factory' ) !== false ) {
                            $files_with_generate[] = str_replace( $plugin_dir, '', $file->getPathname() );
                        }
                    }
                }
            }

            // Find all defined functions starting with woo_feed
            $all_funcs = get_defined_functions();
            $woo_feed_funcs = array();
            foreach ( $all_funcs['user'] as $func ) {
                if ( stripos( $func, 'woo_feed' ) !== false || stripos( $func, 'ctx_feed' ) !== false || stripos( $func, 'webappick' ) !== false ) {
                    $woo_feed_funcs[] = $func;
                }
            }

            // Find defined classes starting with CTX or WooFeed
            $all_classes = get_declared_classes();
            $ctx_classes = array();
            foreach ( $all_classes as $class ) {
                if ( stripos( $class, 'CTXFeed' ) !== false || stripos( $class, 'WooFeed' ) !== false || stripos( $class, 'WebAppick' ) !== false ) {
                    $ctx_classes[] = $class;
                }
            }

            return new WP_REST_Response( array(
                'success' => true,
                'files' => $files_with_generate,
                'functions' => $woo_feed_funcs,
                'classes' => $ctx_classes
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Find Gen Funcs',
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

    console.log('Querying debug-generation-funcs...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-generation-funcs', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Files related to generation:', parsed.files);
      console.log('Functions related to feed:', parsed.functions);
      console.log('Classes related to feed:', parsed.classes);
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
