/**
 * Generates descriptive alt text for images to improve SEO and accessibility.
 * 
 * @param productName - The name of the product
 * @param categoryName - The category of the product (optional)
 * @returns A descriptive string to be used as an image alt attribute
 */
export function generateSeoAltText(productName: string, categoryName?: string): string {
  if (categoryName) {
    return `${productName} - ${categoryName} | Discount Quality Products`;
  }
  return `${productName} | Discount Quality Products`;
}
