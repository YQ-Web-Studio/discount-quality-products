import json

with open('scratch/debug_output.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total options: {len(data.get('woo_feed_options', []))}")
with open('scratch/parsed_options.txt', 'w', encoding='utf-8') as out:
    for opt in data.get('woo_feed_options', []):
        out.write(f"\n==========================================\n")
        out.write(f"OPTION: {opt['option_name']}\n")
        out.write(f"VALUE: {opt['option_value']}\n")
        out.write(f"==========================================\n")
print("Wrote all option details to scratch/parsed_options.txt")
