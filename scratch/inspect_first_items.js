async function run() {
  const url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml";
  try {
    const res = await fetch(url);
    const text = await res.text();
    const items = text.split("<item>");
    console.log("ITEM 1:\n", items[1].split("</item>")[0]);
    console.log("\n====================\n");
    console.log("ITEM 2:\n", items[2].split("</item>")[0]);
  } catch (err) {
    console.error(err);
  }
}
run();
