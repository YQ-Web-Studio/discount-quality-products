"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBasket } from "@/lib/useBasket";
import { useIsMounted } from "@/hooks/useIsMounted";
import { THUMB_SHIMMER } from "@/lib/shimmer";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

/* ─── Shipping options ─── */
const shippingOptions = [
  { id: "standard", label: "Free Delivery", price: 0, eta: "3–5 working days" },
] as const;

interface CheckoutLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  priceFormatted?: string;
  slug?: string;
  manageStock?: boolean;
  stockQuantity?: number | null;
}

const checkoutSteps = ["details", "payment"] as const;
type CheckoutStep = (typeof checkoutSteps)[number];

/* ─── Form field ─── */
function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          "h-11 rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition-colors",
          "placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900",
          error ? "border-red-400" : "border-zinc-200"
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ─── Order summary sidebar ─── */
function OrderSummary({ 
  shippingCost, 
  items, 
  subtotal,
  onUpdateQuantity,
  onRemove
}: { 
  shippingCost: number;
  items: CheckoutLineItem[];
  subtotal: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const isMounted = useIsMounted();
  // VAT-inclusive: prices already contain VAT. Extract it for display.
  const vatIncluded = subtotal / 6;
  const total = subtotal + shippingCost;

  if (!isMounted) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden p-8 animate-pulse">
        <div className="h-4 w-32 bg-zinc-100 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-zinc-50 rounded" />
          <div className="h-20 bg-zinc-50 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900">Order Summary</h3>
      </div>

      {/* Items */}
      <div className="max-h-[200px] sm:max-h-[280px] overflow-y-auto divide-y divide-zinc-50">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 px-5 py-3">
            {/* Thumbnail */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg img-shimmer border border-zinc-100">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill sizes="48px" className="object-contain" placeholder="blur" blurDataURL={THUMB_SHIMMER} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-zinc-200 uppercase">No img</div>
              )}
            </div>
            <div className="flex flex-1 flex-col min-w-0">
              <p className="text-xs font-medium text-zinc-900 truncate">{item.name}</p>
              <p className="text-xs text-zinc-500">{item.priceFormatted} each</p>
              {/* Qty controls */}
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="text-xs font-semibold text-zinc-900 w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={item.manageStock && item.stockQuantity != null && item.quantity >= item.stockQuantity}
                  className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="ml-auto text-zinc-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-900 shrink-0">
              £{(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-zinc-100 px-5 py-4 space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Items</span>
          <span>£{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Shipping</span>
          <span>{shippingCost > 0 ? `£${shippingCost.toFixed(2)}` : "Free"}</span>
        </div>
        <div className="border-t border-zinc-100 pt-2 flex justify-between text-sm font-bold text-zinc-900">
          <span>Total</span>
          <span>£{total.toFixed(2)}</span>
        </div>
        <p className="text-right text-[11px] text-zinc-400">
          Includes £{vatIncluded.toFixed(2)} VAT
        </p>
      </div>
    </div>
  );
}

/* ─── Stripe Payment Form ─── */
function StripePaymentForm({
  total,
  form,
  savedCards,
  clientSecret,
  onSuccess,
}: {
  total: number;
  form: any;
  savedCards: any[];
  clientSecret: string;
  onSuccess: ({ paymentIntentId }?: {
    paymentIntentId?: string;
  }) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    savedCards && savedCards.length > 0 ? savedCards[0].id : "new"
  );

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'GB',
      currency: 'gbp',
      total: { label: 'Total', amount: Math.round(total * 100) },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        console.log('Stripe SDK: Digital Wallet (Apple/Google Pay) is supported:', result);
      } else {
        console.log('Stripe SDK: Digital Wallet (Apple/Google Pay) is not available in this browser.');
      }
    });
  }, [stripe, total]);

  async function handlePayWithSavedCard() {
    if (!stripe || !selectedCardId || !clientSecret) return;
    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: selectedCardId,
    });

    if (error) {
      alert(error.message || "Payment failed. Please try a different card.");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess({ paymentIntentId: paymentIntent.id });
    } else {
      setProcessing(false);
    }
  }

  async function handlePay() {
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      alert(submitError.message || "Payment failed. Please check your card details and try again.");
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.origin + "/checkout/success",
      },
      redirect: "if_required"
    });

    if (error) {
      alert(error.message || "Payment failed. Please check your card details and try again.");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess({ paymentIntentId: paymentIntent.id });
    } else {
      setProcessing(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Saved Cards UI */}
        {savedCards && savedCards.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
              Your Saved Cards
            </h3>
            <div className="grid gap-3">
              {savedCards.map((card) => (
                <label
                  key={card.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                    selectedCardId === card.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="saved_card"
                      value={card.id}
                      checked={selectedCardId === card.id}
                      onChange={() => setSelectedCardId(card.id)}
                      className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900 capitalize">
                        {card.brand} ending in {card.last4}
                      </span>
                      <span className="text-xs text-zinc-500">
                        Expires {card.expiry}
                      </span>
                    </div>
                  </div>
                </label>
              ))}

              <label
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                  selectedCardId === "new"
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="saved_card"
                    value="new"
                    checked={selectedCardId === "new"}
                    onChange={() => setSelectedCardId("new")}
                    className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <span className="text-sm font-medium text-zinc-900">
                    Use a card
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* New Card Form */}
        {selectedCardId === "new" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
              Card Details
            </h3>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <PaymentElement 
                key="stripe-payment-element"
                options={{
                  defaultValues: {
                    billingDetails: {
                      name: form.firstName ? `${form.firstName} ${form.lastName}`.trim() : undefined,
                      email: form.email || undefined,
                      address: {
                        line1: form.address1 || undefined,
                        city: form.city || undefined,
                        postal_code: form.postcode || undefined,
                        country: 'GB',
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={selectedCardId === "new" ? handlePay : handlePayWithSavedCard}
          disabled={processing || !stripe || (!elements && selectedCardId === "new")}
          className="relative w-full overflow-hidden rounded-lg bg-zinc-900 px-6 py-4 flex items-center justify-center gap-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Pay £{total.toFixed(2)}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}

/* ─── Main CheckoutFlow ─── */
export default function CheckoutWrapper({ directCheckoutItem }: { directCheckoutItem?: CheckoutLineItem }) {
  const paypalSdkCurrency = "USD";
  const paypalScriptOptions = useMemo(
    () => ({
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
      currency: paypalSdkCurrency,
      intent: "capture" as const,
      disableFunding: ["card"],
    }),
    [paypalSdkCurrency]
  );

  return (
    <PayPalScriptProvider
      key={`paypal-sdk-${paypalSdkCurrency}`}
      options={paypalScriptOptions}
    >
      <CheckoutFlow directCheckoutItem={directCheckoutItem} />
    </PayPalScriptProvider>
  );
}

function CheckoutFlow({ directCheckoutItem }: { directCheckoutItem?: CheckoutLineItem }) {
  const isMounted = useIsMounted();
  const router = useRouter();
  
  // Persistent Basket State
  const rawItems = useBasket((s) => s.items);
  const clearBasket = useBasket((s) => s.clearBasket);
  const rawItemCount = useBasket((s) => s.itemCount);
  const rawUpdateQuantity = useBasket((s) => s.updateQuantity);
  const rawRemoveItem = useBasket((s) => s.removeItem);

  // Direct Checkout Local State
  const [directQty, setDirectQty] = useState(directCheckoutItem?.quantity || 1);

  // Computed State based on current flow
  const computedItems = useMemo(() => {
    if (directCheckoutItem) {
      return [{ ...directCheckoutItem, quantity: directQty }];
    }
    return rawItems;
  }, [directCheckoutItem, rawItems, directQty]);

  const computedItemCount = directCheckoutItem ? directQty : rawItemCount();
  const computedSubtotal = useMemo(() => {
    return computedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [computedItems]);

  function handleUpdateQuantity(id: string, qty: number) {
    if (directCheckoutItem) {
      setDirectQty(Math.max(1, qty));
    } else {
      rawUpdateQuantity(id, qty);
    }
  }

  function handleRemoveItem(id: string) {
    if (directCheckoutItem) {
      // Abandon direct flow
      router.push("/");
    } else {
      rawRemoveItem(id);
    }
  }

  /* Form state */
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    postcode: "",
    address1: "",
    city: "",
  });
  const [isAutofilling, setIsAutofilling] = useState(true);

  useEffect(() => {
    async function loadCustomerData() {
      try {
        const [customerRes, sessionRes] = await Promise.all([
          fetch("/api/account/customer"),
          fetch("/api/auth/session")
        ]);
        
        if (customerRes.ok) {
          const customerData = await customerRes.json();
          const sessionData = sessionRes.ok ? await sessionRes.json() : null;

          if (customerData.customer) {
            const c = customerData.customer;
            // Prefer shipping address, fallback to billing
            const address = c.shipping?.address_1 ? c.shipping : c.billing;
            
            const fallbackName = sessionData?.user?.name || "";
            const fallbackFirstName = fallbackName.split(" ")[0] || "";
            const fallbackLastName = fallbackName.split(" ").slice(1).join(" ") || "";

            setForm(prev => ({
              firstName: prev.firstName || c.first_name || address?.first_name || fallbackFirstName,
              lastName: prev.lastName || c.last_name || address?.last_name || fallbackLastName,
              email: prev.email || c.email || address?.email || sessionData?.user?.email || "",
              postcode: prev.postcode || address?.postcode || "",
              address1: prev.address1 || address?.address_1 || "",
              city: prev.city || address?.city || "",
            }));
          }
        }
      } catch (err) {
        // Silently ignore if not logged in
      } finally {
        setIsAutofilling(false);
      }
    }
    loadCustomerData();
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shipping, setShipping] = useState("standard");
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("details");

  const stripeElementsOptions = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: { 
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#18181b",
          borderRadius: "8px",
          fontFamily: 'Inter, system-ui, sans-serif',
          colorText: '#18181b',
          fontSizeBase: '14px',
        }
      },
    };
  }, [clientSecret]);

  const shippingCost = useMemo(
    () => shippingOptions.find((o) => o.id === shipping)?.price ?? 3.99,
    [shipping]
  );

  const [fetchingSecret, setFetchingSecret] = useState(false);
  const preparedCheckoutSnapshotRef = useRef<string | null>(null);

  const checkoutSnapshot = useMemo(
    () =>
      JSON.stringify({
        items: computedItems.map((item) => ({ id: item.id, quantity: item.quantity })),
        shipping,
        form,
      }),
    [computedItems, form, shipping]
  );

  useEffect(() => {
    if (!clientSecret || processing || fetchingSecret) return;
    if (preparedCheckoutSnapshotRef.current === checkoutSnapshot) return;

    // Any checkout detail change after card preparation invalidates the Stripe session.
    setClientSecret("");
    preparedCheckoutSnapshotRef.current = null;
  }, [checkoutSnapshot, clientSecret, fetchingSecret, processing]);

  /* ─── Validation ─── */
  const validateDetails = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.postcode.trim()) e.postcode = "Required";
    else if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(form.postcode.trim()))
      e.postcode = "Invalid UK postcode";
    if (!form.address1.trim()) e.address1 = "Required";
    if (!form.city.trim()) e.city = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const initialiseCardPayment = useCallback(async () => {
    if (fetchingSecret || clientSecret) return;

    if (!validateDetails()) {
      return;
    }

    setFetchingSecret(true);
    try {
      const res = await fetch("/api/checkout/stripe/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass the full form so customer data is embedded securely in the
        // Stripe PaymentIntent metadata for webhook-side order creation.
        body: JSON.stringify({ items: computedItems, shippingMethod: shipping, form })
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setSavedCards(data.savedCards || []);
        preparedCheckoutSnapshotRef.current = checkoutSnapshot;
      } else {
        alert(data.error || "Failed to initialise payment. Please check your basket.");
      }
    } catch {
      alert("Network error initialising payment. Please check your internet connection.");
    } finally {
      setFetchingSecret(false);
    }
  }, [checkoutSnapshot, clientSecret, computedItems, fetchingSecret, form, shipping, validateDetails]);



  function goToPaymentStep() {
    if (!validateDetails()) {
      return;
    }

    setCurrentStep("payment");
  }

  useEffect(() => {
    if (currentStep !== "payment" || clientSecret || fetchingSecret || processing) return;
    if (!validateDetails()) {
      setCurrentStep("details");
      return;
    }

    void initialiseCardPayment();
  }, [currentStep, clientSecret, fetchingSecret, initialiseCardPayment, processing, validateDetails]);

  function handleSuccess({ paymentIntentId, orderId, orderNumber }: { paymentIntentId?: string; orderId?: number; orderNumber?: string | null } = {}) {
    if (!directCheckoutItem) {
      clearBasket();
    }
    if (orderNumber) {
      router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
    } else if (paymentIntentId) {
      router.push(`/checkout/success?pi=${encodeURIComponent(paymentIntentId)}`);
    } else if (orderId) {
      router.push(`/checkout/success?order=${orderId}`);
    } else {
      router.push("/checkout/success");
    }
  }

  /* ─── Empty basket ─── */
  if (isMounted && computedItemCount === 0 && !processing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100">
          <Truck className="h-8 w-8 text-zinc-300" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Your basket is empty</h2>
        <p className="text-sm text-zinc-500 mb-6 max-w-xs">
          Looks like you haven&apos;t added anything yet. Browse our catalogue to find something you love.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-8 md:px-12">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </button>
      </div>

      <div className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-400">
        {checkoutSteps.map((step, index) => {
          const labels: Record<CheckoutStep, string> = {
            details: "Details",
            payment: "Payment",
          };
          const activeIndex = checkoutSteps.indexOf(currentStep);
          const isActive = step === currentStep;
          const isComplete = index < activeIndex;

          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px]",
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : isComplete
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-400"
                )}
              >
                {index + 1}
              </div>
              <span className={cn(isActive ? "text-zinc-900" : "text-zinc-400")}>{labels[step]}</span>
              {index < checkoutSteps.length - 1 && <span className="text-zinc-200">/</span>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* ── Left: Checkout form and payment methods ── */}
        <div className="flex-1 order-2 lg:order-1">
          <div className="space-y-8">
            {currentStep === "details" && (
              <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 relative">
                <div className="mb-5">
                  <h2 className="text-lg font-bold text-zinc-900 mb-1">Your Details</h2>
                  <p className="text-xs text-zinc-500">
                    Enter your delivery address and contact information.
                  </p>
                </div>
                
                {isAutofilling && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                      <span className="text-xs font-semibold text-zinc-900">Loading your details...</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="First Name"
                    id="firstName"
                    value={form.firstName}
                    onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                    error={errors.firstName}
                    autoComplete="given-name"
                  />
                  <Field
                    label="Last Name"
                    id="lastName"
                    value={form.lastName}
                    onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                    error={errors.lastName}
                    autoComplete="family-name"
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Email"
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                      error={errors.email}
                      placeholder="you@example.co.uk"
                      autoComplete="email"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Address Line 1"
                      id="address1"
                      value={form.address1}
                      onChange={(v) => setForm((f) => ({ ...f, address1: v }))}
                      error={errors.address1}
                      autoComplete="address-line1"
                    />
                  </div>
                  <Field
                    label="Town / City"
                    id="city"
                    value={form.city}
                    onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                    error={errors.city}
                    autoComplete="address-level2"
                  />
                  <Field
                    label="Postcode"
                    id="postcode"
                    value={form.postcode}
                    onChange={(v) => setForm((f) => ({ ...f, postcode: v }))}
                    error={errors.postcode}
                    placeholder="SW1A 1AA"
                    autoComplete="postal-code"
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={goToPaymentStep}
                    className="inline-flex w-full justify-center sm:w-auto items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
                  >
                    Continue to payment
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}



            {currentStep === "payment" && (
              <section className="space-y-6">
                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden isolate">
                  <div className="border-b border-zinc-100 bg-zinc-50/50 p-5">
                    <h2 className="text-lg font-bold text-zinc-900 mb-1 leading-tight">Secure Payment</h2>
                    <p className="text-xs text-zinc-500 font-medium">
                      Select your preferred payment method below
                    </p>
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* ── PayPal (Top) ── */}
                    <div className="w-full mb-8 relative z-0">
                      <PayPalButtons
                        style={{ 
                          layout: "vertical", 
                          color: "gold", 
                          shape: "rect", 
                          label: "pay",
                          height: 48 
                        }}
                        disabled={processing}
                        forceReRender={[computedSubtotal, shipping, processing]}
                        createOrder={async () => {
                          if (!validateDetails()) {
                            throw new Error("Please complete your delivery details before paying with PayPal.");
                          }

                          const res = await fetch("/api/checkout/paypal/create-order", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ items: computedItems, shippingMethod: shipping, form }),
                          });

                          const data = await res.json();
                          if (data.id) return data.id;

                          throw new Error(data.error || "Failed to create PayPal order.");
                        }}
                        onApprove={async (data) => {
                          setProcessing(true);
                          try {
                            const capRes = await fetch("/api/checkout/paypal/capture-order", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderID: data.orderID }),
                            });

                            const capData = await capRes.json();

                            if (capData.success) {
                              const wcRes = await fetch("/api/checkout/create-wc-order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  form,
                                  items: computedItems,
                                  shippingMethod: shipping,
                                  paymentProvider: "paypal",
                                  transactionId: capData.captureId || data.orderID,
                                  paypalOrderId: data.orderID,
                                  payerId: capData.payerId,
                                }),
                              });

                              const wcData = await wcRes.json();
                              if (wcData.success) {
                                handleSuccess({ orderId: wcData.orderId });
                              } else {
                                alert("PayPal capture succeeded but order logging failed. Contact support.");
                                setProcessing(false);
                              }
                            } else {
                              alert(capData.error || "Capture failed.");
                              setProcessing(false);
                            }
                          } catch (err) {
                            alert("Network error during PayPal capture.");
                            setProcessing(false);
                          }
                        }}
                      />
                    </div>

                    {/* ── Separator ── */}
                    <div className="relative my-10">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-100" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold">
                        <span className="bg-white px-4 text-zinc-400">or pay by card</span>
                      </div>
                    </div>

                    {/* ── Card (Stripe) ── */}
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
                      {!clientSecret ? (
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-8 justify-center text-sm text-zinc-500">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                          Initialising secure card form...
                        </div>
                      ) : (
                        <Elements
                          key={clientSecret}
                          stripe={stripePromise}
                          options={stripeElementsOptions}
                        >
                          <StripePaymentForm 
                            total={computedSubtotal + shippingCost} 
                            form={form}
                            clientSecret={clientSecret}
                            savedCards={savedCards}
                            onSuccess={handleSuccess} 
                          />
                        </Elements>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep("details")}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Return to details
                    </button>
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-zinc-400" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Encrypted Checkout</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="w-full lg:w-[360px] shrink-0 order-1 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <OrderSummary 
              shippingCost={shippingCost} 
              items={computedItems}
              subtotal={computedSubtotal}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
            />

            {/* Trust signals */}
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-[11px] text-zinc-500">
                All payments are secured with <span className="font-semibold text-zinc-700">256-bit SSL encryption</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
