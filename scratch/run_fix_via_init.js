const https = require('https');
require('dotenv').config({ path: '.env.local' });

const wpUser = process.env.WORDPRESS_USER;
const wpPassword = process.env.WORDPRESS_APP_PASSWORD;
const wordpressUrl = process.env.WOOCOMMERCE_URL;

const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

function apiRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    // Determine path based on hostname
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
 * Temporary Debug Endpoint to safely trigger batch feed generation via init
 */
add_action( 'init', function () {
    if ( isset( $_GET['run_antigravity_fix'] ) ) {
        $option_name = 'wf_feed_dqpfeed';
        $option = get_option($option_name);
        if ( ! $option ) {
            $err_res = array( 'success' => false, 'error' => 'Feed option not found' );
            update_option( 'antigravity_batch_gen_result', $err_res );
            echo json_encode( $err_res );
            exit;
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

        // Wrap option in the structure expected by V5 FeedHelper
        $feed_info_wrapped = array(
            'option_name' => $option_name,
            'option_value' => $option
        );

        // Increase memory limit and execution time dynamically
        @ini_set( 'memory_limit', '1024M' );
        @set_time_limit( 300 );

        // Remove the warning-generating filters before starting regeneration
        if ( class_exists( 'CTXFeed\\V5\\Override\\CommonOverride' ) ) {
            $instance = CTXFeed\\V5\\Override\\CommonOverride::instance();
            remove_filter( 'woo_feed_filter_product_description', array( $instance, 'remove_enclosure_from_description' ), 10 );
            remove_filter( 'woo_feed_filter_product_short_description', array( $instance, 'remove_enclosure_from_description' ), 10 );
            remove_filter( 'woo_feed_filter_product_title', array( $instance, 'remove_enclosure_from_title' ), 10 );
            remove_filter( 'woo_feed_filter_product_parent_title', array( $instance, 'remove_enclosure_from_title' ), 10 );
        }

        $log = array(
            'db_updated' => $db_updated,
            'start_time' => date('Y-m-d H:i:s')
        );

        try {
            if ( class_exists( 'CTXFeed\\V5\\Helper\\FeedHelper' ) ) {
                $product_ids = CTXFeed\\V5\\Helper\\FeedHelper::get_product_ids( $feed_info_wrapped );
                $log['total_products'] = count($product_ids);
                
                $batch_size = 200;
                $offset = 0;
                $steps = array();
                
                while ( $offset < count($product_ids) ) {
                    $batch_ids = array_slice( $product_ids, $offset, $batch_size );
                    $status = CTXFeed\\V5\\Helper\\FeedHelper::generate_temp_feed_body( $feed_info_wrapped, $batch_ids, $offset );
                    
                    $steps[] = array(
                        'offset' => $offset,
                        'count' => count($batch_ids),
                        'status' => $status
                    );
                    
                    if ( ! $status ) {
                        $log['success'] = false;
                        $log['error'] = 'Batch generation failed';
                        $log['steps'] = $steps;
                        update_option( 'antigravity_batch_gen_result', $log );
                        echo json_encode( $log );
                        exit;
                    }
                    
                    $offset += $batch_size;
                }
                
                $log['steps'] = $steps;
                // Save final feed file
                $save_result = CTXFeed\\V5\\Helper\\FeedHelper::save_feed_file( $feed_info_wrapped, true );
                $log['save_result'] = $save_result;
                $log['success'] = true;
            } else {
                $log['success'] = false;
                $log['error'] = 'FeedHelper class not found';
            }
        } catch ( Exception $e ) {
            $log['success'] = false;
            $log['error'] = $e->getMessage();
        }

        $log['end_time'] = date('Y-m-d H:i:s');
        update_option( 'antigravity_batch_gen_result', $log );
        
        echo json_encode( $log );
        exit;
    }
} );`;

  const snippetPayload = {
    name: 'Antigravity Trigger Batch Init',
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

    console.log('Querying REST API endpoint with run_antigravity_fix=1 parameter...');
    const queryRes = await apiRequest('/wp-json/wp/v2/posts?run_antigravity_fix=1', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      console.log('Success! Saving logs...');
      const fs = require('fs');
      fs.writeFileSync('scratch/init_gen_result.json', queryRes.body, 'utf-8');
      console.log('Logs saved to scratch/init_gen_result.json');
    } else {
      console.log('Query response code:', queryRes.statusCode);
      console.log('Query response body:', queryRes.body);
    }

    console.log('Deleting snippet...');
    await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
