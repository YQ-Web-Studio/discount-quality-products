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
 * Temporary Debug Endpoint 6 (Fix Feed Mapping)
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/debug-db-6', array(
        'methods' => 'GET',
        'callback' => function() {
            $option_name = 'wf_feed_dqpfeed';
            $option = get_option($option_name);
            if (!$option) {
                return new WP_REST_Response(array('success' => false, 'error' => 'Option not found'), 404);
            }

            $raw_before = $option;
            
            // Clean output_type array in feedrules
            if (isset($option['feedrules']['output_type'])) {
                $count = count($option['feedrules']['output_type']);
                for ($i = 0; $i < $count; $i++) {
                    $option['feedrules']['output_type'][$i] = array(); // Set to empty array
                }
            }

            // Let's also restore standard default values if any are blank
            // Note: brand has default "Co" which we can change to "Unbranded" or let it be empty so it queries the brand attribute.
            // Wait, brand is type "pattern" and default "Co" in the option!
            // Let's look at the mapping: brand attribute index is 13:
            // "mattributes" index 13: "brand", type index 13: "pattern", default index 13: "Co".
            // Since it's a "pattern" (static value), it outputs "Co" for every item!
            // We want brand to map to the actual brand attribute "pa_brand"!
            // Let's change brand mapping (index 13) to:
            // - type: "attribute"
            // - attributes: "pa_brand" (or "brand" or "pa_brand" - wait, in WooCommerce product 38958, the brand slug is "pa_brand")
            // Let's change type[13] to 'attribute', attributes[13] to 'pa_brand', and default[13] to ''
            if (isset($option['feedrules']['mattributes'][13]) && $option['feedrules']['mattributes'][13] === 'brand') {
                $option['feedrules']['type'][13] = 'attribute';
                $option['feedrules']['attributes'][13] = 'pa_brand';
                $option['feedrules']['default'][13] = '';
            }

            // Update the option in the database
            $updated = update_option($option_name, $option);

            // Check if generation functions exist
            $funcs = array(
                'woo_feed_cron_update_single_feed' => function_exists('woo_feed_cron_update_single_feed'),
                'woo_feed_generate_feed_by_name' => function_exists('woo_feed_generate_feed_by_name'),
                'woo_feed_generate_feed_by_id' => function_exists('woo_feed_generate_feed_by_id'),
            );

            $regen_output = 'Not run';
            if ($funcs['woo_feed_cron_update_single_feed']) {
                // Run regeneration in the background or synchronously
                ob_start();
                woo_feed_cron_update_single_feed('dqpfeed');
                $regen_output = ob_get_clean();
            }

            return new WP_REST_Response( array(
                'success' => true,
                'updated' => $updated,
                'funcs_exist' => $funcs,
                'regen_output' => $regen_output,
                'raw_after' => $option
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity DB Debug Endpoint 6',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  try {
    // 1. Create and activate the snippet
    console.log('Creating debug snippet 6...');
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
    console.log('Querying debug-db-6 (performing database update and triggering regen)...');
    const queryRes = await apiRequest('/wp-json/dqp/v1/debug-db-6', 'GET');
    console.log('Query Status:', queryRes.statusCode);

    if (queryRes.statusCode === 200) {
      console.log('Saving debug data to scratch/fix_output.json...');
      const fs = require('fs');
      fs.writeFileSync('scratch/fix_output.json', queryRes.body);
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
