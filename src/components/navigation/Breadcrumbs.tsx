import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbPath = {
  label: string;
  href: string;
};

type BreadcrumbsProps = {
  paths: BreadcrumbPath[];
};

export function Breadcrumbs({ paths }: BreadcrumbsProps) {
  // Generate JSON-LD schema for breadcrumbs including Home as the first item
  const allBreadcrumbs = [
    { label: "Home", href: "/" },
    ...paths
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allBreadcrumbs.map((path, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: path.label,
      item: `https://discountqualityproducts.co.uk${path.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-zinc-400">
          <li>
            <Link href="/" className="transition-colors hover:text-zinc-900">
              Home
            </Link>
          </li>
          {paths.map((path, index) => {
            const isLast = index === paths.length - 1;
            return (
              <React.Fragment key={path.href}>
                <li aria-hidden="true" className="select-none text-zinc-300">
                  <ChevronRight className="h-3 w-3" />
                </li>
                <li>
                  {isLast ? (
                    <span className="text-zinc-900">{path.label}</span>
                  ) : (
                    <Link
                      href={path.href}
                      className="transition-colors hover:text-zinc-900"
                    >
                      {path.label}
                    </Link>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
