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
 * Temporary Debug Endpoint 5 for Antigravity
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-db-5', array(
        'methods' => 'GET',
        'callback' => function() {
            // Find CTX Feed class files and grep for output_type processing
            $plugin_dir = WP_PLUGIN_DIR . '/webappick-product-feed-for-woocommerce';
            if (!is_dir($plugin_dir)) {
                return new WP_REST_Response( array('error' => 'Plugin dir not found'), 404 );
            }

            // Let's do a search for output_type usage or formatters
            $output = array();
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($plugin_dir));
            foreach ($it as $file) {
                if ($file->isDir() || $file->getExtension() !== 'php') {
                    continue;
                }
                $content = file_get_contents($file->getPathname());
                if (str_contains($content, 'output_type') || str_contains($content, 'attribute_value')) {
                    // Find lines containing the word output_type
                    $lines = explode("\\n", $content);
                    foreach ($lines as $num => $line) {
                        if (str_contains($line, 'output_type') || str_contains($line, 'wf_clean_val') || str_contains($line, 'attribute_value')) {
                            if (strlen($line) < 300) { // skip minified or very long lines
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
    name: 'Antigravity DB Debug Endpoint 5',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    // 1. Create and activate the snippet
    console.log('Creating debug snippet 5...');
    const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
    console.log('Create Status:', createRes.statusCode);
    
    let snippetId = null;
    try {
      const created = JSON.parse(createRes.body);
      snippetId = created.id;
      console.log('Created Snippet ID:', snippetId);
    } catch (e) {
      console.log('Response body:', createRes.body);
      return;
    }

    // Wait a brief moment
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Query endpoint
    console.log('Querying debug-db-5...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-db-5', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      console.log('Saving debug data to scratch/cpt_search.json...');
      const fs = require('fs');
      fs.writeFileSync('scratch/cpt_search.json', queryRes.body);
      console.log('Data saved successfully!');
    } else {
      console.log('Query failed:', queryRes.body);
    }

    // 3. Delete the debug snippet
    console.log(`Deleting debug snippet ${snippetId}...`);
    await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Error during execution:', error);
  }
}

run();
