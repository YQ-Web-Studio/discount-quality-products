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

wp_user = env_vars.get('WORDPRESS_USER')
wp_password = env_vars.get('WORDPRESS_APP_PASSWORD')
wordpress_url = env_vars.get('WOOCOMMERCE_URL')

url = f"{wordpress_url}/wp-json/wp/v2/settings"

auth_str = f"{wp_user}:{wp_password}"
auth_bytes = auth_str.encode('utf-8')
auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

headers = {
    'Authorization': f'Basic {auth_b64}',
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
}

try:
    print(f"Fetching settings from: {url}")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as response:
        settings = json.loads(response.read().decode('utf-8'))
        print("\n=== SETTINGS ===")
        for k, v in settings.items():
            print(f"{k}: {v}")
except Exception as e:
    print("Error occurred:", str(e))
    if hasattr(e, 'read'):
        print("Response body:", e.read().decode('utf-8'))
