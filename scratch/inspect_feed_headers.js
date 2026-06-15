async function run() {
  const url = "https://admin.discountproducts.co.uk/wp-content/uploads/woo-feed/google/xml/dqpfeed.xml";
  try {
    const res = await fetch(url, { method: "HEAD" });
    console.log("Status:", res.status);
    console.log("Headers:");
    for (const [key, value] of res.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
