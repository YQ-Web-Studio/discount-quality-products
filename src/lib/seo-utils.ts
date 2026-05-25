/**
 * Generates descriptive alt text for images to improve technical SEO and accessibility.
 * Autorun across product listings to target UK English search indexes.
 * 
 * @param productName - The name of the product
 * @param categoryName - The category of the product (optional)
 * @returns A highly descriptive string to be used as an image alt attribute
 */
export function generateSeoAltText(productName: string, categoryName?: string): string {
  const deliveryincentive = "Free standard UK delivery included";
  
  if (categoryName) {
    return `${productName} - ${categoryName} | ${deliveryincentive} | Discount Quality Products`;
  }
  return `${productName} - ${deliveryincentive} | Discount Quality Products`;
}
