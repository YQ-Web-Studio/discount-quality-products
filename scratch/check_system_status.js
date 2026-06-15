const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const url = `${process.env.WOOCOMMERCE_URL}/wp-json/wc/v3/system_status`;
const auth = {
  username: process.env.WOOCOMMERCE_CONSUMER_KEY,
  password: process.env.WOOCOMMERCE_CONSUMER_SECRET
};

axios.get(url, { auth })
  .then(response => {
    const data = response.data;
    console.log("System Status Retrieved Successfully!");
    console.log("Theme:", data.theme.name, "Version:", data.theme.version);
    console.log("Active Plugins:");
    data.active_plugins.forEach(plugin => {
      console.log(`- ${plugin.name} (${plugin.version}) by ${plugin.author_name} - Active: ${plugin.active}`);
    });
  })
  .catch(error => {
    console.error("Error fetching system status:", error.response ? error.response.data : error.message);
  });
