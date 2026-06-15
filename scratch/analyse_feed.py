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

ids = []
titles = []
links = []
images = []

for item in items:
    id_val = item.find('{http://base.google.com/ns/1.0}id')
    title_val = item.find('{http://base.google.com/ns/1.0}title')
    link_val = item.find('link')
    image_val = item.find('{http://base.google.com/ns/1.0}image_link')
    
    if id_val is not None:
        ids.append(id_val.text)
    if title_val is not None:
        titles.append(title_val.text)
    if link_val is not None:
        links.append(link_val.text)
    if image_val is not None:
        images.append(image_val.text)

print(f"Total items in feed: {len(items)}")
print(f"Unique IDs: {len(set(ids))} (e.g. {list(set(ids))[:5]})")
print(f"Unique Titles: {len(set(titles))} (e.g. {list(set(titles))[:5]})")
print(f"Non-None Links: {sum(1 for x in links if x != 'None' and x is not None)}")
print(f"Non-None Images: {sum(1 for x in images if x != 'None' and x is not None)}")
