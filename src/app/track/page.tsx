import { TrackingForm } from "./TrackingForm";

export const metadata = {
  title: "Order Tracking",
  description:
    "Check the status of your order, shipping details, and track your delivery in real-time.",
  alternates: { canonical: "https://discountqualityproducts.co.uk/track" },
};

export default function TrackPage() {
  return (
    <div className="min-h-[80vh] bg-zinc-50 py-16 md:py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl mb-4">
          Track Your Order
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto">
          Enter your Order ID and Billing Email address below to check order status, delivery progress, and tracking details.
        </p>
      </div>
      
      <TrackingForm />
    </div>
  );
}
