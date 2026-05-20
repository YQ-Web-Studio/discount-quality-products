interface Attribute {
  name: string;
  options: string[];
}

interface ProductAttributesProps {
  attributes: Attribute[];
}

const ATTRIBUTE_LABEL_OVERRIDES: Record<string, string> = {
  mpn: "MPN",
  "pa_mpn": "MPN",
  "pa_bulb-shape-code": "Bulb Shape Code",
  "pa_bulb-life-hours": "Bulb Life Hours",
  "pa_lighting-technology": "Lighting Technology",
  "pa_light-colour": "Light Colour",
  "pa_main-colour": "Main Colour",
  "pa_voltage-v": "Voltage (V)",
  "pa_power-w": "Power (W)",
};

function formatAttributeName(name: string): string {
  const normalized = name.trim();
  const lower = normalized.toLowerCase();
  const override = ATTRIBUTE_LABEL_OVERRIDES[lower];
  if (override) return override;

  return normalized
    .replace(/^pa[_-]/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAttributeOption(option: string): string {
  const normalized = option.trim();

  if (!normalized || /\s/.test(normalized)) return normalized;

  const compactValue = /^(?:[a-z]?\d+[a-z]*|\d+(?:\.\d+)?[a-z]+|\d+[a-z]*-\d+[a-z]*)$/i;
  if (compactValue.test(normalized)) {
    return normalized.replace(/[a-z]+/gi, (letters) => letters.toUpperCase());
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bBc\b/g, "BC")
    .replace(/\bEs\b/g, "ES")
    .replace(/\bSes\b/g, "SES")
    .replace(/\bSbc\b/g, "SBC")
    .replace(/\bLed\b/g, "LED")
    .replace(/\bGls\b/g, "GLS")
    .replace(/\bMpn\b/g, "MPN")
    .replace(/(\d+)k\b/gi, "$1K");
}

function splitAttributeOptions(options: string[]): string[] {
  return Array.from(
    new Set(
      options
        .flatMap((option) => option.split("||"))
        .map((option) => option.trim())
        .filter(Boolean)
    )
  ).map(formatAttributeOption);
}

export function ProductAttributes({ attributes }: ProductAttributesProps) {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 lg:mt-12">
      <h2 className="text-xl font-bold text-zinc-900 mb-4">Specifications</h2>
      
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-6">
        <ul className="space-y-4">
          {attributes.map((attr, idx) => (
            <li key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b border-zinc-200/60 pb-3 last:border-0 last:pb-0">
              <span className="text-sm font-semibold text-zinc-900 sm:w-1/3 shrink-0">
                {formatAttributeName(attr.name)}
              </span>
              <span className="text-sm text-zinc-600">
                {splitAttributeOptions(attr.options).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
