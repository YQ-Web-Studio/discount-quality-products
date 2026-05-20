import type { Metadata } from "next";
import { Suspense } from "react";
import SuccessContent from "./SuccessContent";

export const metadata: Metadata = {
  title: "Order Confirmed | Discount Quality Products",
  description: "Your order has been placed successfully.",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
