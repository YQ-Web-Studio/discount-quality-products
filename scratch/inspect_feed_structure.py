import urllib.request
import xml.etree.ElementTree as ET

url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml"
print("Downloading feed...")
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)
try:
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    print("Download complete. Parsing XML...")
    
    root = ET.fromstring(xml_data)
    print(f"Root tag: {root.tag}")
    print(f"Root attributes: {root.attrib}")
    
    # Let's inspect the first few children of root
    print("\n--- Root Children (first 5) ---")
    for idx, child in enumerate(root):
        if idx >= 5:
            break
        print(f"Index {idx} | Tag: {child.tag} | Attributes: {child.attrib} | Text: {child.text[:100] if child.text else 'None'}")
        # Also print the children of this element
        for subchild in child[:5]:
            print(f"  Subchild Tag: {subchild.tag} | Text: {subchild.text[:100] if subchild.text else 'None'}")
            
except Exception as e:
    print(f"Error: {e}")
