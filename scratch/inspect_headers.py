import urllib.request

url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)
try:
    with urllib.request.urlopen(req) as response:
        headers = response.info()
        print("--- HTTP Headers ---")
        for key, value in headers.items():
            print(f"{key}: {value}")
except Exception as e:
    print(f"Error: {e}")
