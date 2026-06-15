import urllib.request
import json
import base64

url = "https://admin.discountproducts.co.uk/graphql"
query = """
query GetPostTypes {
  __schema {
    types {
      name
      kind
      description
    }
  }
}
"""

req = urllib.request.Request(
    url, 
    headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    data=json.dumps({'query': query}).encode()
)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
    
    types = res.get('data', {}).get('__schema', {}).get('types', [])
    woo_types = [t['name'] for t in types if 'feed' in t['name'].lower()]
    print("Found feed-related GraphQL types:")
    print(woo_types)
except Exception as e:
    print(f"Error: {e}")
