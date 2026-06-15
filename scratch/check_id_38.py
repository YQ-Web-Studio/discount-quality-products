import urllib.request
import json
import base64
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

env_vars = {}
with open('.env.local', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('=', 1)
        if len(parts) == 2:
            key = parts[0].strip()
            val = parts[1].strip().strip('"').strip("'")
            env_vars[key] = val

consumer_key = env_vars.get('WOOCOMMERCE_CONSUMER_KEY')
consumer_secret = env_vars.get('WOOCOMMERCE_CONSUMER_SECRET')
wordpress_url = env_vars.get('WOOCOMMERCE_URL')

# Let's try to fetch product ID 38 and also list some products to see their IDs.
auth_str = f"{consumer_key}:{consumer_secret}"
auth_bytes = auth_str.encode('utf-8')
auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

headers = {
    'Authorization': f'Basic {auth_b64}',
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
}

# 1. Fetch product 38
url_38 = f"{wordpress_url}/wp-json/wc/v3/products/38"
try:
    print(f"Fetching product 38 from: {url_38}")
    req = urllib.request.Request(url_38, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as response:
        product = json.loads(response.read().decode('utf-8'))
        print("Product 38 details:")
        print("Name:", product.get('name'))
        print("Slug:", product.get('slug'))
        print("Price:", product.get('price'))
except Exception as e:
    print("Error fetching product 38:", str(e))
    if hasattr(e, 'read'):
        print("Response body:", e.read().decode('utf-8'))

# 2. Fetch first page of products to see real product IDs
url_list = f"{wordpress_url}/wp-json/wc/v3/products?per_page=5"
try:
    print(f"\nFetching some products from: {url_list}")
    req = urllib.request.Request(url_list, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as response:
        products = json.loads(response.read().decode('utf-8'))
        print("Real products list:")
        for p in products:
            print(f"- ID: {p.get('id')} | Name: {p.get('name')} | Price: {p.get('price')} | Slug: {p.get('slug')}")
except Exception as e:
    print("Error fetching products list:", str(e))
