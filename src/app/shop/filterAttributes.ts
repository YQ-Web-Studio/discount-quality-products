import type { MappedProduct } from "@/lib/woocommerce";

export type AttributeValueKind = "wattage" | "default";

export type CanonicalAttribute = {
  slug: string;
  label: string;
  valueKind: AttributeValueKind;
};

export function getCanonicalAttribute(name: string): CanonicalAttribute {
  const normalized = name.toLowerCase().trim();

  if (normalized === "wattage" || normalized === "bulb wattage" || normalized === "power (w)") {
    return { slug: "pa_wattage", label: "Wattage", valueKind: "wattage" };
  }

  return {
    slug: "pa_" + normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    label: name,
    valueKind: "default",
  };
}

export function slugifyTermValue(term: string, valueKind: AttributeValueKind = "default"): string {
  const normalized = term.toLowerCase().trim();

  if (valueKind === "wattage") {
    const wattage = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:w|watts?)?$/);
    if (wattage) return `${wattage[1]}w`;
  }

  return normalized
    .replace(/&/g, " and ")
    .replace(/['']/g, "")
    .replace(/[(),]/g, "")
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function splitAttributeOptions(options: string[] | undefined): string[] {
  const values = options
    ?.flatMap((option) => option.split("||"))
    .map((option) => option.trim())
    .filter(Boolean) ?? [];

  return Array.from(new Set(values));
}

function getValuesFromNamedAttributes(
  product: MappedProduct,
  names: string[],
  valueKind: AttributeValueKind
): string[] {
  const nameSet = new Set(names);
  const values = product.attributes
    ?.filter((attr) => nameSet.has(attr.name.toLowerCase().trim()))
    .flatMap((attr) => splitAttributeOptions(attr.options))
    .map((option) => slugifyTermValue(option, valueKind))
    .filter(Boolean) ?? [];

  return Array.from(new Set(values));
}

export function getProductFilterValues(product: MappedProduct, slug: string): string[] {
  if (slug === "pa_wattage") {
    const bulbWattage = getValuesFromNamedAttributes(product, ["bulb wattage"], "wattage");
    if (bulbWattage.length > 0) return bulbWattage;

    const wattage = getValuesFromNamedAttributes(product, ["wattage"], "wattage");
    if (wattage.length > 0) return wattage;

    return getValuesFromNamedAttributes(product, ["power (w)"], "wattage");
  }

  const values = product.attributes
    ?.filter((attr) => getCanonicalAttribute(attr.name).slug === slug)
    .flatMap((attr) => {
      const canonical = getCanonicalAttribute(attr.name);
      return splitAttributeOptions(attr.options).map((option) => slugifyTermValue(option, canonical.valueKind));
    })
    .filter(Boolean) ?? [];

  return Array.from(new Set(values));
}

export function productMatchesAttributeFilters(
  product: MappedProduct,
  filters: Record<string, string>
): boolean {
  return Object.entries(filters).every(([slug, rawValue]) => {
    const valueKind = slug === "pa_wattage" ? "wattage" : "default";
    const selectedValues = rawValue
      .split(",")
      .map((value) => slugifyTermValue(value, valueKind))
      .filter(Boolean);

    if (selectedValues.length === 0) return true;

    const productValues = getProductFilterValues(product, slug);
    return selectedValues.some((selected) => productValues.includes(selected));
  });
}
