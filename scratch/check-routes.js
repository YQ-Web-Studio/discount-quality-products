async function check() {
  const url = process.env.WOOCOMMERCE_URL || 'http://discount-products-backend.local';
  console.log('Checking routes for:', url);
  try {
    const res = await fetch(url + '/wp-json/wc/v3');
    const data = await res.json();
    const routes = Object.keys(data.routes).filter(r => r.includes('token'));
    console.log('Token routes found:', routes);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
check();
