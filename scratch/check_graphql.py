import urllib.request
import json
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

wordpress_url = env_vars.get('WOOCOMMERCE_URL')
url = f"{wordpress_url}/graphql"

query = """
query {
  products(first: 5) {
    nodes {
      databaseId
      name
      slug
      ... on SimpleProduct {
        price
      }
    }
  }
}
"""

headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
}

data = json.dumps({'query': query}).encode('utf-8')

try:
    print(f"Fetching from GraphQL: {url}")
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    with urllib.request.urlopen(req, context=ctx) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        print(json.dumps(res_data, indent=2))
except Exception as e:
    print("Error occurred:", str(e))
    if hasattr(e, 'read'):
        print("Response body:", e.read().decode('utf-8'))
