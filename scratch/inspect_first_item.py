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

if items:
    print(f"Total items in channel: {len(items)}")
    first_item = items[0]
    print("\n--- First Item Tags ---")
    for child in first_item:
        print(f"Tag: {child.tag} | Text: {child.text[:120] if child.text else 'None'}")
        
    print("\n--- Namespaces in root ---")
    # Let's inspect namespace mapping if possible by parsing with namespace discovery
    import io
    events = ET.iterparse(io.BytesIO(xml_data), events=['start-ns'])
    namespaces = {}
    for event, elem in events:
        prefix, uri = elem
        namespaces[prefix] = uri
    print(namespaces)
