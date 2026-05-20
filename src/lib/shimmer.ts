/**
 * Shimmer placeholder utilities for next/image.
 *
 * Generates a tiny inline SVG that animates a shimmer sweep.
 * Used as `blurDataURL` with `placeholder="blur"` on every
 * <Image> component throughout the store — no network request,
 * no dependency, zero cost.
 */

/**
 * Build an animated shimmer SVG and encode it as a base64 data URI
 * suitable for the next/image `blurDataURL` prop.
 *
 * @param w - Width of the placeholder (does not need to match the image exactly).
 * @param h - Height of the placeholder.
 */
export function shimmerDataURL(w = 700, h = 700): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop stop-color="#f1f1f1" offset="20%" />
          <stop stop-color="#e8e8e8" offset="50%" />
          <stop stop-color="#f1f1f1" offset="70%" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-200 0"
            to="200 0"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)" />
    </svg>`;

  const base64 = Buffer.from(svg.trim()).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/** Pre-computed square shimmer for product images (most common use case). */
export const PRODUCT_SHIMMER = shimmerDataURL(700, 700);

/** Pre-computed small shimmer for thumbnails and mini-cart. */
export const THUMB_SHIMMER = shimmerDataURL(80, 80);
