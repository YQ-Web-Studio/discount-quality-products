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
 * Temporary Debug Endpoint 8 (Find hooks)
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-db-8', array(
        'methods' => 'GET',
        'callback' => function() {
            $plugin_dir = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce';
            $output = array();
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($plugin_dir));
            foreach ($it as $file) {
                if ($file->isDir() || $file->getExtension() !== 'php') {
                    continue;
                }
                $content = file_get_contents($file->getPathname());
                if (str_contains($content, 'add_action') && (str_contains($content, 'feed') || str_contains($content, 'cron'))) {
                    $lines = explode("\\n", $content);
                    foreach ($lines as $num => $line) {
                        if (str_contains($line, 'add_action') && (str_contains($line, 'feed') || str_contains($line, 'cron'))) {
                            if (strlen($line) < 300) {
                                $output[] = array(
                                    'file' => basename($file->getPathname()),
                                    'line' => $num + 1,
                                    'content' => trim($line)
                                );
                            }
                        }
                    }
                }
            }

            return new WP_REST_Response( array(
                'success' => true,
                'matches' => array_slice($output, 0, 100)
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Debug Endpoint 8',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    console.log('Creating debug snippet 8...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    
    let snippetId = JSON.parse(createRes.body).id;
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Querying debug-db-8...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-db-8', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Found matches:', parsed.matches.length);
      parsed.matches.forEach(m => {
        console.log(`[${m.file}:${m.line}] ${m.content}`);
      });
    }

    await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
