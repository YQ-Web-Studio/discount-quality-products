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
 * Temporary Debug Endpoint to fix options, bypass the filter parameter bug, and regenerate feed
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/fix-and-generate-bypass', array(
        'methods' => 'POST',
        'callback' => function() {
            $option_name = 'wf_feed_dqpfeed';
            $option = get_option($option_name);
            if ( ! $option ) {
                return new WP_REST_Response( array( 'success' => false, 'error' => 'Feed option not found' ), 404 );
            }

            $option = maybe_unserialize($option);

            // 1. Clean output_type array in feedrules
            if ( isset( $option['feedrules']['output_type'] ) && is_array( $option['feedrules']['output_type'] ) ) {
                $count = count( $option['feedrules']['output_type'] );
                for ( $i = 0; $i < $count; $i++ ) {
                    $option['feedrules']['output_type'][$i] = array(); // Set to empty array
                }
            }

            // 2. Fix Brand mapping (Index 13)
            if ( isset( $option['feedrules']['mattributes'][13] ) && $option['feedrules']['mattributes'][13] === 'brand' ) {
                $option['feedrules']['type'][13] = 'attribute';
                $option['feedrules']['attributes'][13] = 'pa_brand';
                $option['feedrules']['default'][13] = '';
            }

            // 3. Update option in database
            $db_updated = update_option( $option_name, $option );

            // 4. Remove the crashing filters before triggering regeneration
            if ( class_exists( 'CTXFeed\\V5\\Override\\CommonOverride' ) ) {
                $instance = CTXFeed\\V5\\Override\\CommonOverride::instance();
                remove_filter( 'woo_feed_filter_product_description', array( $instance, 'remove_enclosure_from_description' ), 10 );
                remove_filter( 'woo_feed_filter_product_short_description', array( $instance, 'remove_enclosure_from_description' ), 10 );
            }

            // 5. Trigger feed generation
            $generation_result = 'Not triggered';
            $feed_url = '';
            if ( function_exists( 'woo_feed_generate_feed' ) ) {
                ob_start();
                $feed_url = woo_feed_generate_feed( $option, 'dqpfeed' );
                $generation_result = ob_get_clean();
            }

            return new WP_REST_Response( array(
                'success' => true,
                'db_updated' => $db_updated,
                'feed_url' => $feed_url,
                'generation_logs' => $generation_result,
                'option_after' => $option
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Fix and Generate Feed Bypass',
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

    console.log('Querying fix-and-generate-bypass API endpoint...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/fix-and-generate-bypass', 'POST');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      const fs = require('fs');
      fs.writeFileSync('scratch/bypass_result.json', JSON.stringify(parsed, null, 2), 'utf-8');
      console.log('Successfully saved result to scratch/bypass_result.json');
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
