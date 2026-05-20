"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Box } from "lucide-react";
import { PRODUCT_SHIMMER, THUMB_SHIMMER } from "@/lib/shimmer";

interface GalleryImage {
  sourceUrl: string;
  altText?: string;
}

interface ProductGalleryProps {
  mainImage?: GalleryImage | null;
  galleryImages?: GalleryImage[];
  productName: string;
  badges?: React.ReactNode;
  saleRibbon?: React.ReactNode;
}

export function ProductGallery({
  mainImage,
  galleryImages = [],
  productName,
  badges,
  saleRibbon,
}: ProductGalleryProps) {
  // Combine main image + gallery images, deduplicating by URL
  // Memoize to ensure stable references for reconciliation
  const allImages = useMemo(() => [
    ...(mainImage ? [mainImage] : []),
    ...galleryImages.filter((g) => g.sourceUrl !== mainImage?.sourceUrl),
  ], [mainImage, galleryImages]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  
  const activeImage = allImages[activeIndex] ?? null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  return (
    // Use flex-col-reverse on mobile (thumbnails at bottom), flex-row on desktop
    <div className="flex flex-col-reverse lg:flex-row gap-3 items-start">

      {/* ── Thumbnail strip (bottom on mobile, left on desktop) ────────────────────────────── */}
      <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-20 shrink-0 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
        {allImages.length > 0 ? (
          allImages.map((img, i) => (
            <button
              key={img.sourceUrl}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`
                relative aspect-square w-16 lg:w-full shrink-0 overflow-hidden rounded-lg img-shimmer outline-none transition-all duration-150
                ${i === activeIndex
                  ? "ring-2 ring-primary ring-offset-2 opacity-100"
                  : "ring-1 ring-zinc-200 opacity-50 hover:opacity-100"
                }
              `}
            >
              <Image
                src={img.sourceUrl}
                alt={img.altText || `${productName} – image ${i + 1}`}
                fill
                sizes="80px"
                className="object-contain"
                placeholder="blur"
                blurDataURL={THUMB_SHIMMER}
              />
            </button>
          ))
        ) : (
          <div key="placeholder-thumb" className="aspect-square w-16 lg:w-full shrink-0 rounded-lg border-2 border-zinc-100 bg-zinc-50" />
        )}
      </div>

      {/* ── Main image ────────────────────────────────────────────────── */}
      <div 
        className={`group relative aspect-square w-full max-h-[500px] flex-1 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 shadow-sm ${isZooming ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onMouseMove={handleMouseMove}
        onClick={() => setIsZooming(!isZooming)}
        onMouseLeave={() => setIsZooming(false)}
      >
        {activeImage ? (
          <div className="relative h-full w-full">
            {/* Standard image layer */}
            <Image
              src={activeImage.sourceUrl}
              alt={activeImage.altText || productName}
              fill
              /**
               * Main gallery image: full-width on mobile,
               * constrained to 800px on large screens (two-column layout).
               */
              sizes="(max-width: 1024px) 100vw, 800px"
              className={`object-contain object-center transition-opacity duration-300 ${isZooming ? 'opacity-0' : 'opacity-100'}`}
              priority
              placeholder="blur"
              blurDataURL={PRODUCT_SHIMMER}
            />

            {/* Zoomed image layer - Always rendered but visibility controlled to stabilize React tree */}
            <div 
              className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${isZooming ? 'opacity-100' : 'opacity-0'}`}
              style={{
                backgroundImage: `url(${activeImage.sourceUrl})`,
                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                backgroundSize: '250%',
                backgroundRepeat: 'no-repeat'
              }}
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-zinc-300">
            <Box className="h-16 w-16" strokeWidth={1} />
            <span className="text-sm font-medium uppercase tracking-widest">No Image Available</span>
          </div>
        )}

        {/* Overlay badges (rarity, condition) */}
        {badges && (
          <div className={`absolute left-3 top-3 flex flex-col gap-1.5 z-10 transition-opacity duration-300 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
            {badges}
          </div>
        )}

        {/* Sale ribbon */}
        {saleRibbon && (
          <div className={`absolute right-3 top-3 z-10 transition-opacity duration-300 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
            {saleRibbon}
          </div>
        )}
      </div>

    </div>
  );
}
