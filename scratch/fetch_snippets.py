import urllib.request
import json
import base64
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Read credentials from .env.local
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

url = f"{wordpress_url}/wp-json/code-snippets/v1/snippets?active=true&per_page=100"

auth_str = f"{wp_user}:{wp_password}"
auth_bytes = auth_str.encode('utf-8')
auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

headers = {
    'Authorization': f'Basic {auth_b64}',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}

try:
    print(f"Fetching snippets from: {url}")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as response:
        snippets = json.loads(response.read().decode('utf-8'))
        
        with open('scratch/all_snippets.txt', 'w', encoding='utf-8') as out:
            out.write(f"Found {len(snippets)} snippets:\n")
            for snippet in snippets:
                out.write(f"\n==========================================\n")
                out.write(f"ID: {snippet.get('id')} | Title: {snippet.get('name')}\n")
                out.write(f"Active: {snippet.get('active')} | Scope: {snippet.get('scope')}\n")
                out.write(f"Code:\n{snippet.get('code')}\n")
                out.write(f"==========================================\n")
        print("Wrote all snippets to scratch/all_snippets.txt successfully.")
except Exception as e:
    print("Error occurred:", str(e))
