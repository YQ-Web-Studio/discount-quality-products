async function run() {
  const url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml";
  try {
    const res = await fetch(url);
    const text = await res.text();
    
    // Find all <item> blocks
    const items = text.split("<item>");
    console.log("Total <item> tags in feed:", items.length - 1);
    
    const sampleItems = [];
    let weirdCount = 0;
    let normalCount = 0;
    
    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const idMatch = item.match(/<g:id><!\[CDATA\[(.*?)\]\]><\/g:id>/);
      const titleMatch = item.match(/<g:title><!\[CDATA\[(.*?)\]\]><\/g:title>/);
      
      const id = idMatch ? idMatch[1] : "N/A";
      const title = titleMatch ? titleMatch[1] : "N/A";
      
      if (id.includes(".") || !title || /^\d+(\.\d+)?$/.test(title)) {
        weirdCount++;
        if (sampleItems.length < 15) {
          sampleItems.push({ index: i, id, title });
        }
      } else {
        normalCount++;
      }
    }
    
    console.log("Weird/Broken items count:", weirdCount);
    console.log("Normal items count:", normalCount);
    console.log("Samples of weird items:", JSON.stringify(sampleItems, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
