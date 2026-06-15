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
 * Temporary Debug Endpoint to safely trigger batch feed generation
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/trigger-batch-generate', array(
        'methods' => 'POST',
        'callback' => function() {
            $option_name = 'wf_feed_dqpfeed';
            $option = get_option($option_name);
            if ( ! $option ) {
                return new WP_REST_Response( array( 'success' => false, 'error' => 'Feed option not found' ), 404 );
            }

            $option = maybe_unserialize($option);
            
            // Resolve class names
            if ( ! class_exists( 'CTXFeed\\V5\\Helper\\FeedHelper' ) ) {
                return new WP_REST_Response( array( 'success' => false, 'error' => 'FeedHelper class not found' ), 500 );
            }

            // Get product IDs
            $product_ids = CTXFeed\\V5\\Helper\\FeedHelper::get_product_ids( $option );
            if ( empty( $product_ids ) || ! is_array( $product_ids ) ) {
                return new WP_REST_Response( array( 'success' => false, 'error' => 'No products found' ), 500 );
            }

            $total_products = count( $product_ids );
            $batch_size = 200;
            $offset = 0;
            $steps = array();

            // Run generation in batches to prevent memory limits
            while ( $offset < $total_products ) {
                $batch_ids = array_slice( $product_ids, $offset, $batch_size );
                $status = CTXFeed\\V5\\Helper\\FeedHelper::generate_temp_feed_body( $option, $batch_ids, $offset );
                
                $steps[] = array(
                    'offset' => $offset,
                    'count' => count($batch_ids),
                    'status' => $status
                );

                if ( ! $status ) {
                    return new WP_REST_Response( array(
                        'success' => false,
                        'error' => 'Batch generation failed',
                        'offset' => $offset,
                        'steps' => $steps
                    ), 500 );
                }

                $offset += $batch_size;
            }

            // Save the final feed file
            $save_file = CTXFeed\\V5\\Helper\\FeedHelper::save_feed_file( $option, true );

            return new WP_REST_Response( array(
                'success' => true,
                'total_products' => $total_products,
                'steps' => $steps,
                'save_file_result' => $save_file
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Trigger Batch Generate',
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

    console.log('Querying trigger-batch-generate API endpoint...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/trigger-batch-generate', 'POST');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      const parsed = JSON.parse(queryRes.body);
      const fs = require('fs');
      fs.writeFileSync('scratch/batch_gen_result.json', JSON.stringify(parsed, null, 2), 'utf-8');
      console.log('Successfully saved result to scratch/batch_gen_result.json');
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
