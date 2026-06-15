import urllib.request
import xml.etree.ElementTree as ET

url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)
with urllib.request.urlopen(req) as response:
    xml_data = response.read()

root = ET.fromstring(xml_data)
channel = root.find('channel')
items = channel.findall('item')

for idx, item in enumerate(items[:5]):
    print(f"\n--- Item {idx} ---")
    for child in item:
        print(f"Tag: {child.tag} | Text: {child.text}")
