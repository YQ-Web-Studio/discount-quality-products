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

url = f"{wordpress_url}/wp-json/wc/v3/system_status"

auth_str = f"{consumer_key}:{consumer_secret}"
auth_bytes = auth_str.encode('utf-8')
auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

headers = {
    'Authorization': f'Basic {auth_b64}',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        
        # Save complete system status JSON
        with open('scratch/system_status_full.json', 'w', encoding='utf-8') as out:
            json.dump(data, out, indent=2)
            
        print("Success! Full system status saved to scratch/system_status_full.json")
        
        # Check for mu_plugins
        mu_plugins = data.get('environment', {}).get('mu_plugins', [])
        print(f"\nMust Use Plugins ({len(mu_plugins)}):")
        for p in mu_plugins:
            print(f"- {p.get('name')} ({p.get('version')}) | Path: {p.get('plugin')}")
            
except Exception as e:
    print("Error:", str(e))
