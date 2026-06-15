import re
import xml.etree.ElementTree as ET

# Since content.md has line numbers, let's strip them and extract the raw XML content.
xml_lines = []
start_xml = False

with open(r'C:\Users\yusuf\.gemini\antigravity-ide\brain\5d94ea27-b616-4e3e-bfa0-18156a9e4e28\.system_generated\steps\490\content.md', 'r', encoding='utf-8') as f:
    for line in f:
        # Strip line number if present
        m = re.match(r'^\d+:\s*(.*)', line)
        if m:
            content_line = m.group(1)
        else:
            content_line = line
            
        if '<rss' in content_line:
            start_xml = True
        if start_xml:
            xml_lines.append(content_line)

xml_str = ''.join(xml_lines)

# Find first few <item> blocks
items = re.findall(r'<item>(.*?)</item>', xml_str, re.DOTALL)
print(f"Total items found in feed sample: {len(items)}")

for idx, item in enumerate(items[:10]):
    print(f"\n--- ITEM {idx+1} ---")
    for tag in ['g:id', 'g:title', 'g:description', 'link', 'g:image_link', 'g:price', 'g:sale_price', 'g:brand']:
        m_tag = re.search(r'<' + tag + r'[^>]*>(.*?)</' + tag + r'>', item, re.DOTALL)
        val = m_tag.group(1) if m_tag else "NOT FOUND"
        print(f"{tag}: {val}")
