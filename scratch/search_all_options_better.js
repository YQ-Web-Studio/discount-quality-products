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
 * Temporary Debug Endpoint (Better Option Search)
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-options-better', array(
        'methods' => 'GET',
        'callback' => function() {
            global $wpdb;
            
            $options = $wpdb->get_results(
                "SELECT option_name, length(option_value) as val_length FROM {$wpdb->options} WHERE option_name LIKE '%wf_%' OR option_name LIKE '%dqp%' OR option_name LIKE '%woo_feed%' OR option_name LIKE '%feed%'"
            );

            return new WP_REST_Response( array(
                'success' => true,
                'options' => $options
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Option Search',
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

    console.log('Querying options list...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-options-better', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      console.log('Found options count:', parsed.options.length);
      console.log('Options list:');
      console.log(JSON.stringify(parsed.options, null, 2));
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
