import { WpPost } from './wordpress';

/**
 * High-authority, SEO-optimised static fallback guide articles.
 * These act as rich SEO landing pages for key UK search terms (light bulb bases, electrical conduit, BZP fasteners, numismatics).
 * If the WordPress backend GraphQL fails or hasn't created these posts yet, these articles are seamlessly served with full ArticleSchema JSON-LD.
 */
export const LOCAL_SEO_GUIDES: WpPost[] = [
  {
    id: "local-guide-1",
    databaseId: 9001,
    slug: "uk-light-bulb-cap-base-fitting-guide",
    title: "The Ultimate UK Light Bulb Cap & Base Fitting Guide: B22, E27, GU10 & Beyond",
    date: "2026-07-15T09:00:00.000Z",
    modified: "2026-08-01T10:30:00.000Z",
    excerpt: "Confused by B22, BC, E27, ES, GU10, and MR16 light bulb codes? Our definitive UK light bulb fitting guide breaks down every cap size, voltage, and retrofit LED option for homes and trade.",
    author: {
      node: {
        name: "Discount Quality Products Technical Team",
      },
    },
    featuredImage: {
      node: {
        sourceUrl: "https://images.unsplash.com/photo-1550985616-10810253b84d?auto=format&fit=crop&w=1200&q=80",
        altText: "Assorted LED and filament light bulb caps and fittings guide",
        mediaDetails: {
          width: 1200,
          height: 630,
        },
      },
    },
    categories: {
      nodes: [
        { name: "Lighting & Bulbs", slug: "light-bulbs-lighting" },
      ],
    },
    content: `
      <p class="lead">Choosing the right replacement light bulb in the UK can feel overwhelming with dozens of code acronyms like B22, E27, GU10, E14, and MR16. Using the wrong cap size or voltage can result in ill-fitting lamps or short-circuited fittings.</p>

      <h2>1. Bayonet Cap Light Bulbs (B22 & B15)</h2>
      <p>Bayonet caps are the traditional standard across United Kingdom households. They feature a push-and-twist mechanism with two side pins on the base.</p>
      <ul>
        <li><strong>B22 / BC (22mm Bayonet Cap):</strong> The standard 22mm diameter push-and-twist bulb used in majority of UK ceiling pendants and lamps.</li>
        <li><strong>B15 / SBC (15mm Small Bayonet Cap):</strong> A miniature 15mm version commonly found on wall sconces, chandeliers, and bedside touch lamps.</li>
      </ul>

      <h2>2. Edison Screw Light Bulbs (E27 & E14)</h2>
      <p>Edison screw bases feature a threaded metal mount that screws clockwise into the socket holder. Originally popular across continental Europe, they are now widespread across modern UK light fittings.</p>
      <ul>
        <li><strong>E27 / ES (27mm Edison Screw):</strong> Standard 27mm wide screw base used in contemporary pendant lights, outdoor lanterns, and floor lamps.</li>
        <li><strong>E14 / SES (14mm Small Edison Screw):</strong> Miniature 14mm screw base used in candle bulbs, golfball lamps, and appliances.</li>
      </ul>

      <h2>3. Spotlight Caps (GU10 & MR16 / GU5.3)</h2>
      <p>Spotlights and downlights require specialized pin bases designed for directional lighting in kitchens, bathrooms, and commercial displays.</p>
      <ul>
        <li><strong>GU10 (240V Mains Twist-Lock):</strong> Features two solid metal studs 10mm apart. Operates on standard 240V mains power without a transformer. Twist 90 degrees to lock into place.</li>
        <li><strong>MR16 / GU5.3 (12V Low Voltage 2-Pin):</strong> Features two thin needle pins spaced 5.3mm apart. Requires a 12V lighting transformer or LED driver to operate.</li>
      </ul>

      <h2>4. Linear Fluorescent & LED Tube Sizes (T4, T5, T8 & T9)</h2>
      <p>Tube lighting is measured by eighths of an inch in diameter ("T" number):</p>
      <ul>
        <li><strong>T4 (12mm diameter):</strong> Ultra-compact 2-pin tubes widely used for under-cabinet kitchen counter strip lighting (e.g. 6W, 16W, 20W daylight and warm white).</li>
        <li><strong>T5 (16mm diameter):</strong> Slim high-efficiency tubes used in modern office troffers and zapper units.</li>
        <li><strong>T8 (26mm diameter):</strong> Classic standard commercial garage and warehouse overhead lighting.</li>
        <li><strong>T9 Circular (29mm diameter):</strong> Ring-shaped circular fluorescent tubes used in bathroom ceiling domes and magnifying desk lamps.</li>
      </ul>

      <h2>Summary: Quick Bulb Cap Comparison Chart</h2>
      <table>
        <thead>
          <tr>
            <th>Fitting Code</th>
            <th>Common Name</th>
            <th>Base Diameter</th>
            <th>Mechanism</th>
            <th>Standard UK Voltage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>B22 / BC</td>
            <td>Standard Bayonet Cap</td>
            <td>22mm</td>
            <td>Push &amp; Twist</td>
            <td>240V Mains</td>
          </tr>
          <tr>
            <td>E27 / ES</td>
            <td>Standard Edison Screw</td>
            <td>27mm</td>
            <td>Threaded Screw</td>
            <td>240V Mains</td>
          </tr>
          <tr>
            <td>GU10</td>
            <td>Mains Spotlight</td>
            <td>10mm stud spacing</td>
            <td>Twist-Lock Studs</td>
            <td>240V Mains</td>
          </tr>
          <tr>
            <td>MR16 / GU5.3</td>
            <td>Low Voltage Spotlight</td>
            <td>5.3mm pin spacing</td>
            <td>Push-fit Needle Pins</td>
            <td>12V AC/DC (Needs Driver)</td>
          </tr>
        </tbody>
      </table>
    `,
  },
  {
    id: "local-guide-2",
    databaseId: 9002,
    slug: "bzp-fasteners-screws-bolts-trade-guide",
    title: "Understanding BZP, Galvanised & Stainless Steel Fasteners: Trade Selection Guide",
    date: "2026-07-20T11:30:00.000Z",
    modified: "2026-08-02T14:15:00.000Z",
    excerpt: "What is Bright Zinc Plated (BZP) steel? Learn how to choose between BZP, Hot-Dipped Galvanised, and A2/A4 Stainless Steel bolts, screws, coach screws, and T-nuts for trade and woodworking.",
    author: {
      node: {
        name: "Discount Quality Products Technical Team",
      },
    },
    featuredImage: {
      node: {
        sourceUrl: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=1200&q=80",
        altText: "Assorted zinc plated steel bolts, nuts, and industrial timber fasteners",
        mediaDetails: {
          width: 1200,
          height: 630,
        },
      },
    },
    categories: {
      nodes: [
        { name: "Hardware & Tools", slug: "hardware-tools" },
      ],
    },
    content: `
      <p class="lead">Selecting the correct fastener finish is critical for structural safety, load-bearing integrity, and preventing premature rust. Whether you are installing timber joists, cabinet fittings, or electrical conduit, matching the steel coating to your environment is essential.</p>

      <h2>1. What is BZP (Bright Zinc Plated) Steel?</h2>
      <p>Bright Zinc Plating involves electro-depositing a thin layer of zinc over carbon steel, followed by a clear passivation chemical treatment. This produces a shiny silver aesthetic that protects against interior humidity and mild corrosion.</p>
      <ul>
        <li><strong>Best For:</strong> Indoor carpentry, furniture assembly, electrical conduit mounting, dry walling, and trade workshop storage.</li>
        <li><strong>Key Products:</strong> M8/M10/M12 Captive T-Nuts, Roofing Bolts, Mending Straight Plates, 2BA Machine Screws, and Spring Tool Clips.</li>
      </ul>

      <h2>2. Hot-Dipped Galvanised vs. Stainless Steel (A2 / A4)</h2>
      <p>For outdoor landscaping or high-moisture commercial environments, standard BZP coating is insufficient to stop red rust over time.</p>
      <ul>
        <li><strong>Hot-Dipped Galvanised (HDG):</strong> Steel is submerged in molten zinc, forming a thick rugged coating (~50–85 microns). Ideal for fence posts, garden decking, and outdoor steel framework.</li>
        <li><strong>A2 (304) Stainless Steel:</strong> Excellent general outdoor corrosion resistance for marine environments and food processing.</li>
        <li><strong>A4 (316) Acid-Proof Marine Grade:</strong> Essential for coastal installations exposed to saltwater sprays and aggressive de-icing salts.</li>
      </ul>

      <h2>3. Specialized Trade Timber & Cabinet Fixings</h2>
      <p>Understanding specialized fastener geometries ensures maximum holding power without splitting timber or stripping threads:</p>
      <ul>
        <li><strong>Pronged Captive T-Nuts:</strong> Features four sharp steel prongs that dig flush into timber when tightened. Provides a permanent steel metric female thread in wood for bolt attachments.</li>
        <li><strong>DIN603 Carriage / Coach Bolts:</strong> Features a smooth dome head with a square neck underneath. As the nut is tightened, the square neck locks into the wood to prevent rotation.</li>
        <li><strong>DIN571 Lag Wood Screws:</strong> Heavy-duty hexagonal head screws designed for high torque socket wrench insertion into masonry wall plugs or thick structural timber posts.</li>
      </ul>
    `,
  },
  {
    id: "local-guide-3",
    databaseId: 9003,
    slug: "uk-50p-2-commemorative-coin-collecting-guide",
    title: "The UK Commemorative 50p & £2 Coin Collecting Guide: Rare Mintage & BU Editions",
    date: "2026-07-28T14:00:00.000Z",
    modified: "2026-08-05T09:45:00.000Z",
    excerpt: "Discover the rarest UK 50p and £2 commemorative coins in circulation and Brilliant Uncirculated (BU) Royal Mail packs. Mintage figures, valuation factors, and preservation advice for collectors.",
    author: {
      node: {
        name: "Discount Quality Products Numismatic Specialist",
      },
    },
    featuredImage: {
      node: {
        sourceUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=1200&q=80",
        altText: "Commemorative British 50p coins and Royal Mint collector packaging",
        mediaDetails: {
          width: 1200,
          height: 630,
        },
      },
    },
    categories: {
      nodes: [
        { name: "Collectibles & Coins", slug: "coins-stamps" },
      ],
    },
    content: `
      <p class="lead">The United Kingdom 50p and £2 coins are among the most actively collected legal tender coins in the world. From the iconic 2009 Kew Gardens 50p to modern Harry Potter and Royal Jubilee releases, numismatics offers an exciting blend of history and investment potential.</p>

      <h2>1. Circulated vs. Brilliant Uncirculated (BU) Condition</h2>
      <p>Understanding coin condition grades is fundamental when valuing British coins:</p>
      <ul>
        <li><strong>Circulated (In Change):</strong> Coins retrieved from pocket change that exhibit minor contact marks, surface wear, and loss of original mint lustre.</li>
        <li><strong>Brilliant Uncirculated (BU):</strong> Struck on specially polished dies at higher pressure. BU coins feature sharp relief detail, zero circulation scratches, and are sealed directly into official protective presentation cards or blister packs.</li>
        <li><strong>Silver Proof / Gold Proof:</strong> Highest specification collector coins struck multiple times on polished precious metal blanks with frosted relief details.</li>
      </ul>

      <h2>2. Key 50p Coins & Rare Mintage Figures</h2>
      <p>Scarcity is primarily determined by mintage figures released by The Royal Mint. Lower mintage numbers directly correlate with long-term demand:</p>
      <ul>
        <li><strong>2009 Kew Gardens 50p:</strong> Only 210,000 struck for circulation, making it the rarest circulating UK 50p coin.</li>
        <li><strong>2011 Olympic Games Series (29 Designs):</strong> Low mintage sports designs including Football (Offside rule - 1.1m), Judo (1.1m), Wrestling (1.1m), and Triathlon (1.1m).</li>
        <li><strong>2018 Peter Rabbit & Beatrix Potter:</strong> High collector interest across the original 2016-2020 Beatrix Potter character releases.</li>
        <li><strong>2022 Hogwarts Express / Harry Potter 25th Anniversary:</strong> Special dual-effigy series featuring Queen Elizabeth II and King Charles III.</li>
      </ul>

      <h2>3. Protecting & Storing Your Coin Collection</h2>
      <p>Improper storage can permanently ruin a coin's surface through oxidation, fingerprint oils, and PVC chemical damage.</p>
      <ul>
        <li>Never clean coins with abrasive metal polishes or acid dips; cleaning removes original mint lustre and reduces collector value by up to 80%.</li>
        <li>Use archival-safe PVC-free coin flips, acid-free cardboard capsules, or original sealed BU presentation packs.</li>
        <li>Store collections in low-humidity, temperature-controlled environments away from direct sunlight.</li>
      </ul>
    `,
  },
];

/**
 * Merges WordPress backend posts with high-authority local SEO guide pages.
 */
export function combineWithLocalSeoGuides(wpPosts: WpPost[]): WpPost[] {
  const existingSlugs = new Set(wpPosts.map(p => p.slug));
  const missingLocalGuides = LOCAL_SEO_GUIDES.filter(g => !existingSlugs.has(g.slug));
  return [...wpPosts, ...missingLocalGuides];
}

/**
 * Tries to find a local SEO guide by slug if missing from WordPress.
 */
export function getLocalSeoGuideBySlug(slug: string): WpPost | null {
  return LOCAL_SEO_GUIDES.find(g => g.slug === slug) || null;
}
