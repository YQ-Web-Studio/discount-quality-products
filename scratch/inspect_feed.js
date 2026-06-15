async function run() {
  const url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml";
  try {
    const res = await fetch(url);
    const text = await res.text();
    // Print the first 2000 characters
    console.log(text.substring(0, 2500));
  } catch (err) {
    console.error(err);
  }
}
run();
