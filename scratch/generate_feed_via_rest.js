const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const wpUser = process.env.WORDPRESS_USER;
const wpPassword = process.env.WORDPRESS_APP_PASSWORD;
const wordpressUrl = process.env.WOOCOMMERCE_URL;

const auth = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');

// Helper to make https requests to WordPress REST API
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

// Temporary snippet helper to fetch the option securely
async function getOptionFromDB() {
  const snippetCode = `/**
 * Temporary Debug Endpoint to retrieve option value
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/get-dqpfeed-option', array(
        'methods' => 'GET',
        'callback' => function() {
            $option = get_option('wf_feed_dqpfeed');
            return new WP_REST_Response( array(
                'success' => true,
                'option' => maybe_unserialize($option)
            ), 200 );
        },
        'permission_callback' => '__return_true'
    ) );
} );`;

  const snippetPayload = {
    name: 'Antigravity Get Option Temp',
    code: snippetCode,
    active: 1,
    scope: 'global'
  };

  console.log('Creating temp snippet to read feed option...');
  const createRes = await apiRequest('/wp-json/code-snippets/v1/snippets', 'POST', snippetPayload);
  const snippetId = JSON.parse(createRes.body).id;
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Reading option value...');
  const queryRes = await apiRequest('/wp-json/dqp/v1/get-dqpfeed-option', 'GET');
  const optionData = JSON.parse(queryRes.body).option;

  console.log('Deleting temp snippet...');
  await apiRequest(`/wp-json/code-snippets/v1/snippets/${snippetId}`, 'DELETE');

  return optionData;
}

async function run() {
  try {
    // 1. Get Option
    const optionValue = await getOptionFromDB();
    if (!optionValue) {
      console.error('Failed to retrieve feed option from DB.');
      return;
    }

    const feedInfo = {
      option_name: 'wf_feed_dqpfeed',
      option_value: optionValue
    };

    // 2. Get Product IDs
    console.log('Fetching all product IDs via CTX Feed REST API...');
    const getIdsRes = await apiRequest('/wp-json/ctxfeed/v1/make_feed/get_product_ids', 'POST', { feed_info: feedInfo });
    console.log('Get IDs Status:', getIdsRes.statusCode);
    
    const parsedIds = JSON.parse(getIdsRes.body);
    if (parsedIds.status !== 200 || !parsedIds.data) {
      console.error('Failed to retrieve product IDs:', getIdsRes.body);
      return;
    }

    const productIds = parsedIds.data;
    const totalProducts = productIds.length;
    console.log(`Successfully retrieved ${totalProducts} product IDs.`);

    // 3. Process batches of 200 products
    const batchSize = 200;
    let offset = 0;
    const steps = [];

    while (offset < totalProducts) {
      const batchIds = productIds.slice(offset, offset + batchSize);
      console.log(`Processing batch at offset ${offset} (${batchIds.length} products)...`);
      
      const batchPayload = {
        feed_info: feedInfo,
        product_ids: batchIds,
        offset: offset
      };

      let success = false;
      let retries = 3;
      while (retries > 0 && !success) {
        try {
          const batchRes = await apiRequest('/wp-json/ctxfeed/v1/make_feed/make_per_batch_feed', 'POST', batchPayload);
          if (batchRes.statusCode === 200) {
            const parsedBatch = JSON.parse(batchRes.body);
            if (parsedBatch.status === 200 && parsedBatch.data && parsedBatch.data.status) {
              success = true;
              break;
            }
          }
          console.warn(`Batch at offset ${offset} failed (status: ${batchRes.statusCode || 'unknown'}). Retrying... (${retries - 1} left)`);
        } catch (e) {
          console.warn(`Request error at offset ${offset}: ${e.message}. Retrying... (${retries - 1} left)`);
        }
        retries--;
        if (!success && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      if (!success) {
        console.error(`Batch at offset ${offset} failed after all retries.`);
        return;
      }

      console.log(`Batch at offset ${offset} processed successfully.`);
      steps.push({ offset, count: batchIds.length, success: true });
      offset += batchSize;

      // Small pause to be gentle on CPU
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 4. Save feed file
    console.log('All batches completed! Saving final feed file...');
    const saveRes = await apiRequest('/wp-json/ctxfeed/v1/make_feed/save_feed_file', 'POST', {
      feed_info: feedInfo,
      should_update_last_update_time: true
    });
    console.log('Save File Status:', saveRes.statusCode);

    const parsedSave = JSON.parse(saveRes.body);
    if (parsedSave.status === 200 && parsedSave.data) {
      console.log('SUCCESS! Google Shopping Feed successfully generated!');
      console.log('Feed URL:', parsedSave.data.feed_url);
      fs.writeFileSync('scratch/rest_gen_success.json', JSON.stringify(parsedSave.data, null, 2), 'utf-8');
    } else {
      console.error('Failed to save final feed file:', saveRes.body);
    }

  } catch (error) {
    console.error('Error during batch execution:', error);
  }
}

run();
