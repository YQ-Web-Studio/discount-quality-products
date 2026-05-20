import { ReturnsForm } from "./ReturnsForm";

export const metadata = {
  title: "Returns & Refunds",
  description:
    "Look up your order and submit a return request online. We honour our 30-day money-back guarantee for all purchases.",
  alternates: { canonical: "https://discountqualityproducts.co.uk/returns" },
};

export default function ReturnsPage() {
  return (
    <div className="min-h-[80vh] bg-zinc-50 py-16 md:py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-4">
          Returns & Refunds
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto">
          We are committed to honouring our 30-day money-back guarantee. Enter your order details below to begin the returns process.
        </p>
      </div>
      
      <ReturnsForm />
    </div>
  );
}
