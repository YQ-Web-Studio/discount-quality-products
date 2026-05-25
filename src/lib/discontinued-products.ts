export interface DiscontinuedProductRule {
  status: 301 | 410;
  redirectUrl?: string; // required if status is 301
}

/**
 * Registry of permanently discontinued product slugs.
 * Crawlers will instantly receive 301 Permanent Redirects for active successors,
 * and 410 Gone status codes for dead products, immediately pruning them from search indexes.
 */
export const DISCONTINUED_PRODUCTS_REGISTRY: Record<string, DiscontinuedProductRule> = {
  // Example 301: A successor product exists
  "vintage-leather-jacket-old": {
    status: 301,
    redirectUrl: "/products/vintage-leather-jacket-new",
  },
  
  // Example 301: Redirect to a relevant category page
  "classic-wired-keyboard-obsolete": {
    status: 301,
    redirectUrl: "/shop?category=computing",
  },

  // Example 410: The product is permanently gone, no replacement exists
  "broken-bulb-vintage-filament": {
    status: 410,
  },
  
  "limited-edition-gaming-mouse-2018": {
    status: 410,
  },
};
