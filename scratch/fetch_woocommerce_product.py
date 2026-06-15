import urllib.request
import json
import base64

url = "https://admin.discountproducts.co.uk/wp-json/wc/v3/products?per_page=5"
consumer_key = "ck_238da31e132e48479f2e7751e7837597787b6a23"
consumer_secret = "cs_8be07f509363f87d8ee5b91bfa44a099314ecd5d"

auth_string = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
req = urllib.request.Request(
    url, 
    headers={
        'Authorization': f'Basic {auth_string}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        products = json.loads(response.read().decode())
    
    print(f"Fetched {len(products)} products from WooCommerce:")
    for p in products:
        print(f"ID: {p['id']} | Name: {p['name']} | Price: {p['price']} | Weight: {p['weight']} | Dimensions: {p.get('dimensions', {})}")
except Exception as e:
    print(f"Error: {e}")
