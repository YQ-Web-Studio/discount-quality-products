import { Truck, ShieldCheck, RotateCcw, Award } from "lucide-react";

const signals = [
  {
    icon: Truck,
    title: "Free UK Delivery",
    description: "On all orders over £5",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "Fully encrypted checkout",
  },
  {
    icon: RotateCcw,
    title: "Hassle-Free Returns",
    description: "30-day money back",
  },
  {
    icon: Award,
    title: "Expert Support",
    description: "24/7 Global Assistance",
  },
];

export function TrustBar() {
  return (
    <section className="border-y border-zinc-100 bg-zinc-50/50 py-12">
      <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 md:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((signal) => (
            <div key={signal.title} className="flex items-center justify-center gap-4 sm:justify-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
                <signal.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-zinc-900">{signal.title}</h3>
                <p className="text-xs text-zinc-500">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
