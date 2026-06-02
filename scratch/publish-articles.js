/**
 * publish-articles.js
 * Publishes the three Trade Hub articles to WordPress via the REST API.
 * Uses Application Password auth (WORDPRESS_USER + WORDPRESS_APP_PASSWORD).
 * Run: node publish-articles.js
 */

const WP_BASE = 'https://admin.discountproducts.co.uk/wp-json/wp/v2';
const WP_USER = 'admin';
const WP_APP_PASSWORD = 'XWYB 0qgc c0q9 OCuZ hcwX Onke';

const authHeader =
  'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

// ─── Article content (Markdown converted to HTML inline) ─────────────────────
// WordPress REST API accepts HTML content. We send clean HTML built from the
// article Markdown. The /guides/[slug] Next.js page renders via sanitize-html
// so standard block-level tags are perfectly safe here.

const articles = [
  {
    slug: 'mr16-vs-gu10-spotlight-guide',
    title: 'MR16 vs GU10 Spotlight Bulbs: Which Fitting Do You Actually Need?',
    excerpt:
      'MR16 and GU10 spotlight bulbs look nearly identical but are electrically incompatible. This guide explains the voltage difference, how to identify your fitting, and which technology to choose for UK domestic and commercial installations.',
    content: `<p>If you are replacing a spotlight bulb and you are not certain whether you need an MR16 or a GU10, you are not alone. The two fittings look nearly identical in size and shape, yet they are electrically incompatible. Fitting the wrong type can blow your transformer or simply leave you with a bulb that will not seat properly. This guide cuts straight to the differences so you can order the correct lamp the first time.</p>

<hr>

<h2>The Core Difference: Voltage</h2>
<p>This is the single most important distinction.</p>

<table>
<thead><tr><th></th><th>MR16 (GU5.3)</th><th>GU10</th></tr></thead>
<tbody>
<tr><td>Operating voltage</td><td>12 V AC/DC</td><td>230 V mains</td></tr>
<tr><td>Requires transformer?</td><td>Yes</td><td>No</td></tr>
<tr><td>Pin type</td><td>2× round pins, 5.3 mm apart</td><td>2× twist-lock pins with feet</td></tr>
<tr><td>Pin diameter</td><td>5.3 mm</td><td>6.35 mm</td></tr>
</tbody>
</table>

<p>An MR16 bulb runs at <strong>12 V</strong> and requires a compatible low-voltage transformer or driver in the ceiling. A GU10 runs directly off the <strong>230 V mains</strong> supply. There is no safe workaround for this mismatch — you must identify your fitting before ordering.</p>

<h2>How to Identify Your Fitting Without a Ladder</h2>

<h3>Check the existing bulb</h3>
<ul>
<li>If the two pins are <strong>round pegs</strong> that slide straight in, it is an <strong>MR16 (GU5.3)</strong>.</li>
<li>If the two pins have <strong>small feet at the base</strong> and require a quarter-turn to lock, it is a <strong>GU10</strong>.</li>
</ul>

<h3>Check your transformer</h3>
<p>If you have a transformer in the ceiling void or above the fitting, the circuit is almost certainly 12 V — meaning MR16. GU10 fittings have no transformer; they wire directly to the mains.</p>

<h3>Measure the pin gap</h3>
<ul>
<li>5.3 mm apart → GU5.3 (MR16)</li>
<li>6.35 mm apart with lock feet → GU10</li>
</ul>

<h2>Beam Angle: What the Numbers Mean</h2>
<ul>
<li><strong>Narrow spot (&lt; 25°)</strong> — accent lighting, display cabinets, artwork</li>
<li><strong>Flood (35°–45°)</strong> — general room task lighting, kitchen worktops</li>
<li><strong>Wide flood (&gt; 60°)</strong> — diffuse ambient fill, replacing a wider area</li>
</ul>
<p>The <a href="https://www.discountproducts.co.uk/products/50w-osram-mr16-46870-fl-24-deg-gu5-3-12v-halogen-dimmable-spot-light-bulbs-lamp/">OSRAM 50W MR16 GU5.3 12V Halogen Spotlight</a> is a 24° flood — a reliable mid-range angle for domestic downlighting in a standard ceiling height of 2.4 m.</p>

<h2>Halogen vs LED: Which Technology to Choose</h2>

<h3>Halogen MR16 &amp; GU10</h3>
<p>Halogen lamps produce excellent colour rendering (CRI ≥ 95) and are fully dimmable with existing leading-edge dimmers. They run hot, which can be a concern in enclosed fittings, and their lifespan is typically 2,000–4,000 hours.</p>
<ul>
<li><a href="https://www.discountproducts.co.uk/products/50w-osram-mr16-46870-fl-24-deg-gu5-3-12v-halogen-dimmable-spot-light-bulbs-lamp/">OSRAM 50W MR16 GU5.3 Halogen Dimmable Spotlight</a> — industry benchmark for 12 V halogen quality</li>
<li><a href="https://www.discountproducts.co.uk/products/2x-50w-casell-amber-coloured-mr16-12v-halogen-dichroic-spot-light-bulb-lamp-beam/">Casell 50W Amber MR16 12V Halogen Dichroic Spot</a> — coloured option for decorative or theatrical use</li>
</ul>

<h3>LED MR16 &amp; GU10</h3>
<p>LED lamps use 80–90% less energy for equivalent lumen output and last up to 15,000–25,000 hours. Not all LEDs are dimmable — they require a compatible trailing-edge or LED-rated dimmer if dimming is needed.</p>
<ul>
<li><a href="https://www.discountproducts.co.uk/products/2x-5w-crompton-mr16-gu5-3-12v-led-2700k-warm-reflector-spotlight-light-bulb-lamp/">Crompton 5W MR16 GU5.3 12V LED 2700K Warm White</a> — non-dimmable, direct 50 W halogen replacement</li>
<li><a href="https://www.discountproducts.co.uk/products/1x-8w-50w-diall-led-dimmable-mr16-gu5-3-2700k-reflector-spot-light-bulb-lamps/">Diall 8W LED Dimmable MR16 GU5.3 2700K</a> — dimmable LED with 621 lm output, 15,000-hour lifespan</li>
<li><a href="https://www.discountproducts.co.uk/products/1x-7w-50w-philips-mr16-gu5-3-12v-dimmable-led-reflector-spotlight-light-bulb/">Philips 7W Dimmable LED MR16 GU5.3 12V 2700K</a> — 621 lm, suitable for retrofit into existing 12 V circuits</li>
<li><a href="https://www.discountproducts.co.uk/products/1x-6w-75w-bell-dimmable-led-gu10-reflector-spot-light-bulb-2700k-halo-elite/">Bell 6W Dimmable LED GU10 2700K Halo Elite</a> — 75 W equivalent on a direct 230 V mains fitting, trailing-edge dimmable</li>
</ul>

<h2>Quick-Decision Summary</h2>
<ul>
<li><strong>Choose MR16 (GU5.3)</strong> if you have an existing 12 V transformer system and the pins are plain round pegs.</li>
<li><strong>Choose GU10</strong> if your fitting wires directly to the mains and the pins have locking feet.</li>
<li><strong>Choose halogen</strong> if you need the highest possible colour fidelity or are working with a legacy leading-edge dimmer you cannot change.</li>
<li><strong>Choose LED</strong> if long lamp life, low running cost, and low heat output are the priority.</li>
</ul>
<p>All MR16 and GU10 lamps listed above are in stock and available with free standard UK delivery.</p>`,
  },

  {
    slug: 'fluorescent-tube-codes-explained',
    title: 'How to Read a Fluorescent Tube Code: T4, T5 and T8 Explained',
    excerpt:
      'T8 G13, T5 G5, T4 2-pin — fluorescent tube codes encode diameter, cap type and colour temperature. This guide decodes every part of the designation so you can select the correct replacement without errors.',
    content: `<p>Walk into any electrical wholesaler or search online for a replacement fluorescent tube and you will encounter codes like T8 G13, T5 G5, or T4 2-pin. These codes encode tube diameter, length, cap type, and colour temperature — all the critical parameters you need to select a compatible replacement. This guide decodes every part of the designation.</p>

<hr>

<h2>Part 1: The "T" Number — Tube Diameter</h2>
<p>The "T" stands for tubular. The number that follows it is the tube diameter expressed in <strong>eighths of an inch</strong>.</p>

<table>
<thead><tr><th>Code</th><th>Diameter (imperial)</th><th>Diameter (metric)</th></tr></thead>
<tbody>
<tr><td>T4</td><td>4/8 inch</td><td>~12.7 mm</td></tr>
<tr><td>T5</td><td>5/8 inch</td><td>~15.9 mm</td></tr>
<tr><td>T8</td><td>8/8 inch (1 inch)</td><td>~25.4 mm</td></tr>
</tbody>
</table>

<h3>T4 Tubes</h3>
<p>T4 is the slimmest common fluorescent format. Most T4 tubes use a <strong>2-pin G4 or G5 cap</strong> and are found in under-cabinet striplight fittings, bathroom mirror lights, and compact under-shelf lighting.</p>
<p>The <a href="https://www.discountproducts.co.uk/products/4x-20w-t4-2-pin-565mm-fluorescent-tube-strip-light-bulb-6400k-daylight-white/">T4 20W 565mm 6400K Daylight Fluorescent Tube</a> is a 2-pin T4 in the full 565 mm length at 6400 K daylight colour — a common size in kitchen under-cabinet and bathroom fittings.</p>

<h3>T5 Tubes</h3>
<p>T5 is widely used in office luminaires, retail display cabinets, and task lighting systems. They use a <strong>G5 (2-pin miniature)</strong> cap and are not backwards-compatible with T8 fittings. Standard lengths: 300 mm (8 W), 550 mm (14 W), 850 mm (21 W), 1,150 mm (28 W).</p>
<ul>
<li><a href="https://www.discountproducts.co.uk/products/4x-8w-t5-12-300mm-fluorescent-tube-strip-light-bulbs-2700k-warm-white-g5/">T5 8W 300mm G5 Fluorescent Tube 2700K Warm White — pack of 4</a></li>
<li><a href="https://www.discountproducts.co.uk/products/2x-8w-t5-12-300mm-fluorescent-tube-strip-light-bulbs-2700k-warm-white-g5/">T5 8W 300mm G5 Fluorescent Tube 2700K Warm White — pack of 2</a></li>
</ul>

<h3>T8 Tubes</h3>
<p>T8 is the most widely installed fluorescent format in commercial and industrial environments worldwide. The 25 mm diameter accommodates a <strong>G13 bi-pin cap</strong> and is used in standard 2 ft (600 mm) and 4 ft (1,200 mm) batten fittings.</p>
<ul>
<li><a href="https://www.discountproducts.co.uk/products/1x-18w-philips-t8-2ft-24-600mm-fluorescent-tube-strip-light-bulbs-3500k-lamps/">Philips T8 18W 2ft 600mm 3500K G13 Fluorescent Tube</a> — the definitive commercial-grade 2 ft tube in white (3500 K)</li>
</ul>

<h2>Part 2: The Cap Code — What Goes into the Fitting</h2>

<table>
<thead><tr><th>Cap Code</th><th>Pins</th><th>Common Format</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>G5</td><td>2-pin, 5 mm spacing</td><td>T5 mini</td><td>Under-cabinet, display</td></tr>
<tr><td>G13</td><td>2-pin bi-pin, 13 mm spacing</td><td>T8 standard</td><td>Office, industrial, retail</td></tr>
<tr><td>G4 / 2-pin</td><td>2-pin, 4 mm spacing</td><td>T4</td><td>Bathroom, kitchen rail</td></tr>
<tr><td>2G11</td><td>4-pin, square base</td><td>PL-L / twin-tube</td><td>Architectural downlights</td></tr>
<tr><td>GR8 / 2-pin</td><td>2-pin flat bridge</td><td>2D lamp</td><td>Corridor, stairwell bulkhead</td></tr>
</tbody>
</table>

<p><strong>This is where most ordering errors happen.</strong> A T8 tube with a G13 cap will not fit a T5 G5 fitting regardless of length. Always verify both the tube type and the cap type before ordering.</p>

<h2>Part 3: The Colour Code — Reading the Three-Digit Number</h2>

<h3>First digit — Colour Rendering Index (CRI) class</h3>
<table>
<thead><tr><th>First digit</th><th>CRI band</th><th>Typical use</th></tr></thead>
<tbody>
<tr><td>8</td><td>80–89 (Good)</td><td>General commercial, retail</td></tr>
<tr><td>9</td><td>90–99 (Excellent)</td><td>Graphics, colour matching, medical</td></tr>
</tbody>
</table>

<h3>Last two digits — Correlated Colour Temperature (CCT) × 100 K</h3>
<table>
<thead><tr><th>Code</th><th>CCT</th><th>Appearance</th><th>UK common name</th></tr></thead>
<tbody>
<tr><td>27</td><td>2700 K</td><td>Warm, amber</td><td>Warm white</td></tr>
<tr><td>30</td><td>3000 K</td><td>Slightly warm</td><td>White</td></tr>
<tr><td>35</td><td>3500 K</td><td>Neutral</td><td>White / natural</td></tr>
<tr><td>40</td><td>4000 K</td><td>Cool neutral</td><td>Cool white</td></tr>
<tr><td>65</td><td>6500 K</td><td>Bluish</td><td>Daylight</td></tr>
</tbody>
</table>

<p>So a tube marked <strong>835</strong> means CRI 80–89, 3500 K neutral white. The <a href="https://www.discountproducts.co.uk/products/1x-18w-philips-t8-2ft-24-600mm-fluorescent-tube-strip-light-bulbs-3500k-lamps/">Philips T8 18W 600mm 3500K (835)</a> carries exactly this designation.</p>

<h2>Worked Example: Replacing a Tube in a Commercial Batten Fitting</h2>
<p>You have a 2 ft ceiling batten; the tube is marked <strong>Philips TLD 18W/835</strong>. Decoding:</p>
<ul>
<li><strong>TLD</strong> = T8 tube, linear, dimmable</li>
<li><strong>18W</strong> = power consumption</li>
<li><strong>835</strong> = CRI 80+, 3500 K neutral white</li>
<li>Cap = G13 (standard T8 bi-pin)</li>
</ul>
<p>Replacement: <a href="https://www.discountproducts.co.uk/products/1x-18w-philips-t8-2ft-24-600mm-fluorescent-tube-strip-light-bulbs-3500k-lamps/">Philips T8 18W 2ft 600mm G13 3500K</a>.</p>

<h2>Summary</h2>
<p>Getting a fluorescent tube replacement right comes down to three parameters: <strong>diameter (T number)</strong>, <strong>cap type (G code)</strong>, and <strong>colour designation (three-digit code)</strong>. Match all three to your existing tube and the replacement will be plug-and-play.</p>
<p>Our full range of T4, T5, and T8 tubes is in stock and ships with free standard UK delivery.</p>`,
  },

  {
    slug: 'cfl-vs-led-trade-buying-guide',
    title: 'CFL vs LED: A Straight-Talking Buying Guide for UK Trade Customers',
    excerpt:
      'For trade buyers sourcing in quantity, the choice between CFL and LED has real cost implications over the lifetime of an installation. This guide provides the technical and commercial facts — lifespan, dimming, CRI, and total cost of ownership — without padding.',
    content: `<p>The energy-saving lamp market still carries both CFL (compact fluorescent lamp) and LED technologies. For trade buyers sourcing in quantity — whether for refurbishment contracts, buy-to-let portfolios, or commercial facilities — the choice between the two has real cost implications over the lifetime of an installation. This guide gives you the technical and commercial facts without padding.</p>

<hr>

<h2>What is a CFL?</h2>
<p>A compact fluorescent lamp works on the same principle as a fluorescent tube: an electrical discharge excites mercury vapour, which produces UV radiation, which in turn excites a phosphor coating to emit visible light.</p>

<h3>Key CFL characteristics</h3>
<ul>
<li><strong>Warm-up time</strong>: 30 seconds to 2 minutes to reach full brightness</li>
<li><strong>Lifespan</strong>: 8,000–15,000 hours (dependent on switching frequency)</li>
<li><strong>Dimming</strong>: Only specific CFL types are dimmable; most are not</li>
<li><strong>Mercury content</strong>: CFLs contain a small amount of mercury and must be disposed of at an approved WEEE collection point</li>
<li><strong>CRI</strong>: Typically 80–85</li>
</ul>

<h3>CFL products from current stock</h3>
<ul>
<li><a href="https://www.discountproducts.co.uk/products/1x-20w-100w-ge-low-energy-power-saving-cfl-stick-light-bulbs-bc-b22-lamps/">GE 20W CFL Stick BC B22 (=100W equivalent)</a> — 12,000 hr lifespan, bayonet cap for domestic and commercial pendants</li>
<li><a href="https://www.discountproducts.co.uk/products/2x-18w-philips-2g11-dimmable-light-bulb-4-pin-3000k-pll-cfl-830-warm-white-lamp/">Philips 18W 2G11 4-pin Dimmable PL-L CFL 3000K</a> — one of the few genuinely dimmable CFL formats, used in architectural downlights</li>
<li><a href="https://www.discountproducts.co.uk/products/2x-9w-43w-low-energy-power-saving-cfl-stick-light-bulbs-ses-e14-small-screw/">9W CFL Stick SES E14 Warm White 2700K</a> — small Edison screw retrofit for table lamps and decorative fittings</li>
<li><a href="https://www.discountproducts.co.uk/products/1x-28w-sylvania-double-d-gr8-2-pin-energy-saving-cfl-light-bulb-3500k-2d-lamp/">Sylvania 28W 2D GR8 CFL 3500K</a> — the flat circular 2D format for bulkhead and emergency-light fittings in corridors and stairwells</li>
<li><a href="https://www.discountproducts.co.uk/products/2x-10w-osram-dimmable-g24q-1-4-pin-3500k-low-energy-cfl-pl-light-bulb-lamp/">OSRAM 10W G24q-1 4-pin Dimmable CFL 3500K</a> — dimmable PL format for architectural luminaires with integral dimmer ballasts</li>
</ul>

<h2>What is an LED Lamp?</h2>
<p>A light-emitting diode lamp passes current through a semiconductor junction to produce light directly, with no discharge tube and no mercury. LED technology has matured to the point where it now outperforms CFL in most measurable categories.</p>

<h3>Key LED characteristics</h3>
<ul>
<li><strong>Warm-up time</strong>: Instant — full brightness at switch-on</li>
<li><strong>Lifespan</strong>: 15,000–25,000 hours (some rated to 50,000 hours)</li>
<li><strong>Dimming</strong>: Increasingly standard, provided the driver and dimmer are compatible</li>
<li><strong>Mercury content</strong>: None</li>
<li><strong>CRI</strong>: Ranges from 80 to 97+ depending on product grade</li>
</ul>

<h3>LED products from current stock</h3>
<ul>
<li><a href="https://www.discountproducts.co.uk/products/1x-8w-50w-diall-led-dimmable-mr16-gu5-3-2700k-reflector-spot-light-bulb-lamps/">Diall 8W LED Dimmable MR16 GU5.3 2700K (=50W)</a> — 621 lm, 15,000 hours, dimmable spotlight replacement</li>
<li><a href="https://www.discountproducts.co.uk/products/2x-6w-75w-bell-dimmable-led-gu10-reflector-spot-light-bulb-2700k-halo-elite/">Bell 6W LED Dimmable GU10 2700K Halo Elite (=75W)</a> — mains-voltage LED spotlight with premium Bell driver quality</li>
<li><a href="https://www.discountproducts.co.uk/products/2x-5w-crompton-mr16-gu5-3-12v-led-2700k-warm-reflector-spotlight-light-bulb-lamp/">Crompton 5W MR16 LED 2700K 12V GU5.3</a> — direct halogen replacement on existing 12 V transformer circuits</li>
<li><a href="https://www.discountproducts.co.uk/products/4x-5-3w-40w-diall-r50-reflector-spotlight-led-e14-ses-edison-screw-light-bulb/">Diall 5.3W R50 LED E14 SES 2700K (=40W)</a> — 15,000-hour lifespan, instant-on, not dimmable</li>
</ul>

<h2>Head-to-Head Comparison</h2>
<table>
<thead><tr><th>Criterion</th><th>CFL</th><th>LED</th></tr></thead>
<tbody>
<tr><td>Warm-up to full brightness</td><td>30 sec – 2 min</td><td>Instant</td></tr>
<tr><td>Typical lifespan</td><td>8,000–15,000 hrs</td><td>15,000–25,000 hrs</td></tr>
<tr><td>Energy saving vs incandescent</td><td>~75–80% less</td><td>~85–90% less</td></tr>
<tr><td>Dimmable options available?</td><td>Limited (specific ballasts only)</td><td>Yes — increasingly standard</td></tr>
<tr><td>Mercury / WEEE disposal</td><td>Required</td><td>Not required</td></tr>
<tr><td>Operating temperature sensitivity</td><td>Performance drops in cold</td><td>Minimal effect</td></tr>
<tr><td>Colour rendering (CRI)</td><td>80–85 typical</td><td>80–95+ typical</td></tr>
<tr><td>Unit cost (trade)</td><td>Lower</td><td>Moderate to higher upfront</td></tr>
<tr><td>Total cost of ownership (10 yr)</td><td>Higher</td><td>Lower</td></tr>
</tbody>
</table>

<h2>When CFL Still Makes Sense</h2>
<ol>
<li><strong>The fitting uses a magnetic ballast rated for CFL only</strong> — swapping to LED requires either a compatible LED driver or a full fitting change.</li>
<li><strong>Short-term tenancy or temporary installation</strong> where capital expenditure must be minimised and lamp life beyond three to five years is irrelevant.</li>
<li><strong>Specific cap formats where LED retrofits are not yet universally available</strong> — the <a href="https://www.discountproducts.co.uk/products/1x-18w-philips-2g11-dimmable-light-bulb-4-pin-3000k-pll-cfl-830-warm-white-lamp/">Philips 18W 2G11 Dimmable CFL</a> is one example where the CFL remains a practical first choice.</li>
</ol>

<h2>When LED is the Clear Choice</h2>
<ol>
<li><strong>High-cycling environments</strong> (toilets, corridors, storerooms) — LED is unaffected by switch frequency, which rapidly degrades CFL cathodes.</li>
<li><strong>Dimming circuits</strong> — LED with a trailing-edge dimmer delivers smooth, flicker-free control from 100% to as low as 5% in compatible products.</li>
<li><strong>Cold environments</strong> (external stores, garages, commercial cold rooms) — CFL output drops sharply below 10°C; LED is largely unaffected.</li>
<li><strong>Long-term cost management</strong> — LED's extended lifespan and lower wattage typically achieve payback within 12–24 months in commercial applications.</li>
</ol>

<h2>Summary</h2>
<p>For trade buyers sourcing at scale, LED is the default specification for the majority of applications in 2025. The per-unit cost premium is offset within months by energy savings and the near-elimination of lamp replacement labour costs over a five-year period. CFL remains a valid choice in specific ballast-dependent fittings and short-term installations.</p>
<p>Both CFL and LED lamp ranges are available in stock at Discount Quality Products with free standard UK delivery on all orders.</p>`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function wpPost(endpoint, body) {
  const res = await fetch(`${WP_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(`WP API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function wpGet(endpoint) {
  const res = await fetch(`${WP_BASE}${endpoint}`, {
    headers: { Authorization: authHeader },
  });
  return res.json();
}

// ─── Get or create "Trade Hub" category ──────────────────────────────────────

async function ensureCategory(name, slug) {
  const existing = await wpGet(`/categories?slug=${slug}`);
  if (existing.length > 0) {
    console.log(`  ✓ Category "${name}" exists (id: ${existing[0].id})`);
    return existing[0].id;
  }
  const created = await wpPost('/categories', { name, slug });
  console.log(`  + Created category "${name}" (id: ${created.id})`);
  return created.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n📰 Discount Quality Products — Trade Hub Publisher');
  console.log('='.repeat(50));

  // 1. Ensure category
  console.log('\n[1/2] Checking "Trade Hub" category…');
  const categoryId = await ensureCategory('Trade Hub', 'trade-hub');

  // 2. Publish each article
  console.log('\n[2/2] Publishing articles…\n');

  for (const article of articles) {
    console.log(`  → "${article.title}"`);

    // Check if slug already exists
    const existing = await wpGet(`/posts?slug=${article.slug}&status=any`);
    if (existing.length > 0) {
      console.log(`    ⚠ Post with slug "${article.slug}" already exists (id: ${existing[0].id}) — skipping.\n`);
      continue;
    }

    const post = await wpPost('/posts', {
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      status: 'publish',
      categories: [categoryId],
    });

    console.log(`    ✓ Published  id: ${post.id}`);
    console.log(`    ✓ URL:  ${post.link}`);
    console.log(`    ✓ Headless: https://www.discountproducts.co.uk/guides/${article.slug}\n`);
  }

  console.log('Done.\n');
})();
