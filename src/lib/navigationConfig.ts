export interface Subcategory {
  id: number;
  label: string;
  slug: string;
  wcSlug?: string;
}

export interface NavCategory {
  id: number;
  label: string;
  slug: string;
  /** Tailwind class for accent colour text — must be a complete class string */
  accentColor: string;
  /** Tailwind class for explicitly triggering accent colour on hover */
  hoverText: string;
  /** Tailwind class for bento tile hover overlay — must be a complete class string */
  hoverOverlay: string;
  subcategories: Subcategory[];
}

export const navigationCategories: NavCategory[] = [
  {
    id: 10,
    label: "Electrical",
    slug: "electrical",
    accentColor: "text-emerald-700",
    hoverText: "hover:text-emerald-600",
    hoverOverlay: "group-hover:bg-emerald-600",
    subcategories: [
      { id: 11, label: "Light Bulbs", slug: "light-bulbs" },
      { id: 12, label: "Fittings & Accessories", slug: "fittings-accessories", wcSlug: "accessories" },
    ],
  },
  {
    id: 20,
    label: "Collectibles",
    slug: "collectibles",
    accentColor: "text-amber-700",
    hoverText: "hover:text-amber-600",
    hoverOverlay: "group-hover:bg-amber-600",
    subcategories: [
      { id: 21, label: "Coins & Currency Notes", slug: "coins-currency", wcSlug: "coins-currency-notes" },
      { id: 22, label: "Stamps & First Day Covers", slug: "stamps", wcSlug: "stamps-first-day-covers" },
    ],
  },
  {
    id: 30,
    label: "Media",
    slug: "media",
    accentColor: "text-rose-700",
    hoverText: "hover:text-rose-600",
    hoverOverlay: "group-hover:bg-rose-600",
    subcategories: [
      { id: 31, label: "Magazines & Books", slug: "magazines-books", wcSlug: "magazines" },
      { id: 32, label: "Movies, Blu-Ray & DVDs", slug: "movies-dvds", wcSlug: "movies" },
    ],
  },
  {
    id: 40,
    label: "Computing",
    slug: "computing",
    accentColor: "text-cyan-700",
    hoverText: "hover:text-cyan-600",
    hoverOverlay: "group-hover:bg-cyan-600",
    subcategories: [
      { id: 41, label: "Computer Hardware", slug: "hardware", wcSlug: "computer-hardware" },
      { id: 42, label: "CD-ROM Software", slug: "cd-rom", wcSlug: "cd-rom-software" },
      { id: 43, label: "Vintage & Rare Software", slug: "vintage-software", wcSlug: "cd-rom-software-vintage-rare" },
    ],
  },
  {
    id: 50,
    label: "Miscellaneous",
    slug: "miscellaneous",
    accentColor: "text-violet-700",
    hoverText: "hover:text-violet-600",
    hoverOverlay: "group-hover:bg-violet-600",
    subcategories: [
      { id: 51, label: "Miscellaneous", slug: "various", wcSlug: "miscellaneous" },
      { id: 52, label: "Other", slug: "other", wcSlug: "uncategorised" },
    ],
  },
];
