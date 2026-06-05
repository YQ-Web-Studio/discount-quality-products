"use client";

interface ProductDescriptionProps {
  htmlContent: string;
}

export function ProductDescription({ htmlContent }: ProductDescriptionProps) {
  // ── Strip eBay promotional content ───────────────────────────────────────
  const cleanHtml = (html: string): string => {
    let clean = html;

    // Remove style and script blocks and their contents completely
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Strip bare CSS selector blocks that might leak, e.g. img{max-width:100%}
    clean = clean.replace(/[a-z0-9#.*_,-]+\s*\{\s*[a-z-]+\s*:\s*[^}]+\}/gi, '');

    // Remove entire <a> tags (and their content) that link to eBay
    clean = clean.replace(/<a[^>]*href=["'][^"']*ebay\.(com|co\.uk|ie|com\.au|de|fr)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');

    // Remove any remaining bare eBay links (e.g. href without the wrapping <a> somehow)
    clean = clean.replace(/https?:\/\/(www\.)?ebay\.(com|co\.uk|ie|com\.au|de|fr)[^\s"']*/gi, '');

    // Scrub common eBay marketing phrases (case-insensitive, with surrounding whitespace/tags)
    const marketingPhrases = [
      /visit\s+our\s+e[Bb]ay\s+store[^<]*/gi,
      /check\s+out\s+our\s+other\s+(listings|items)[^<]*/gi,
      /see\s+our\s+other\s+(listings|items)[^<]*/gi,
      /payment\s+(via|by|through|with)\s+paypal[^<]*/gi,
      /we\s+accept\s+paypal[^<]*/gi,
      /powered\s+by\s+frooition[^<]*/gi,
      /frooition\.com[^<]*/gi,
      /add\s+to\s+(your\s+)?favourite\s+sellers[^<]*/gi,
      /add\s+to\s+(your\s+)?favorites?[^<]*/gi,
    ];

    for (const phrase of marketingPhrases) {
      clean = clean.replace(phrase, '');
    }

    // Replace raw BBCode/shortcode newline representations like [/n], [\n], [n], [nl], [/nl] with <br />
    clean = clean.replace(/\[\/?(n|nl|br|r)\]/gi, '<br />');

    // Replace literal escaped newlines/carriage returns (\n, \r, \r\n) with <br />
    clean = clean.replace(/\\r\\n|\\n|\\r/g, '<br />');

    // Replace 2 or more consecutive br tags (including those separated by spaces or &nbsp;) with a single br tag
    clean = clean.replace(/(?:<br\s*\/?>\s*(?:&nbsp;\s*)*){2,}/gi, '<br />');

    // Remove br tags that are immediately adjacent to block-level tags to avoid double/triple spacing
    clean = clean.replace(/<br\s*\/?>\s*(<\/?(p|div|li|ul|ol|h[1-6]|table|tr|td))/gi, '$1');
    clean = clean.replace(/(<\/(p|div|li|ul|ol|h[1-6]|table|tr|td)>)\s*<br\s*\/?>/gi, '$1');

    // Clean up any empty block-level tags or those containing only spaces, &nbsp;, or br tags
    clean = clean.replace(/<(p|div|span|li)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, '');

    return clean;
  };

  const sanitisedHtml = cleanHtml(htmlContent);

  return (
    <div className="mt-8 lg:mt-12">
      <h2 className="text-xl font-bold text-zinc-900 mb-4">Product Description</h2>
      
      <div className="relative rounded-2xl border border-zinc-100 bg-zinc-50/50 p-6">
        <div
          id="pdp-description"
          className="sanitize-html font-sans text-[13px] leading-relaxed text-zinc-900 
            [&_*]:font-normal [&_strong]:font-normal [&_b]:font-normal 
            [&_h1]:text-[13px] [&_h2]:text-[13px] [&_h3]:text-[13px]
            [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: sanitisedHtml }}
        />
      </div>
    </div>
  );
}
