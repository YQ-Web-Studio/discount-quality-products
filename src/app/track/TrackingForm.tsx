"use client";

import { useState } from "react";
import { trackOrder } from "./actions";
import { Search, Package, AlertCircle, CheckCircle2, Truck, Calendar, MapPin, ExternalLink, ChevronLeft, CreditCard } from "lucide-react";
import Image from "next/image";

type OrderStatus = "pending" | "processing" | "completed" | "on-hold" | "cancelled" | "refunded" | "failed" | "return-req";

export function TrackingForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [orderData, setOrderData] = useState<any>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await trackOrder(orderId, email);
    
    if (result.success && result.order) {
      setOrderData(result.order);
    } else {
      setError(result.error || "Failed to lookup order.");
      setOrderData(null);
    }
    
    setLoading(false);
  }

  function handleReset() {
    setOrderData(null);
    setError(null);
  }

  // Determine active steps for the progress bar
  const getStatusStep = (status: OrderStatus): number => {
    switch (status) {
      case "pending":
      case "on-hold":
        return 1;
      case "processing":
        return 2;
      case "completed":
        return 3; // In WooCommerce, completed usually means shipped
      default:
        return 1;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending Payment",
      processing: "Processing & Packing",
      completed: "Dispatched & Completed",
      "on-hold": "On Hold",
      cancelled: "Cancelled",
      refunded: "Refunded",
      failed: "Failed",
      "return-req": "Return Requested",
    };
    return labels[status] || status.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      "on-hold": "bg-zinc-100 text-zinc-800 border-zinc-200",
      cancelled: "bg-rose-100 text-rose-800 border-rose-200",
      refunded: "bg-purple-100 text-purple-800 border-purple-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      "return-req": "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
    return colors[status] || "bg-zinc-100 text-zinc-800 border-zinc-200";
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-800 border border-rose-200 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {!orderData ? (
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4">
          <form onSubmit={handleLookup} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Track Order Status</h2>
              <p className="text-zinc-500 text-sm">Enter the information below to fetch shipping logs, courier status, and order status.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="orderId" className="text-sm font-bold text-zinc-700">Order ID</label>
                <input
                  id="orderId"
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Found in your confirmation email, e.g. 12345"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-zinc-700">Billing Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-4 text-base font-semibold tracking-tight text-white shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] focus-visible:ring-primary disabled:cursor-wait disabled:opacity-50"
            >
              {loading ? "Tracking Order..." : "Track Order"}
              {!loading && <Search className="w-5 h-5" />}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Header Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-6 mb-6">
              <div>
                <button 
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-primary transition-colors mb-3 uppercase tracking-wider outline-none"
                >
                  <ChevronLeft className="w-4 h-4" /> Track another order
                </button>
                <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                  Order #{orderData.id}
                </h2>
                <p className="text-zinc-500 text-xs mt-1">
                  Placed on {new Date(orderData.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className={`text-center px-4 py-2 rounded-full border-2 text-xs font-extrabold tracking-wider uppercase ${getStatusColor(orderData.status)}`}>
                {getStatusLabel(orderData.status)}
              </div>
            </div>

            {/* Visual Progress Steps */}
            {!["cancelled", "failed", "refunded"].includes(orderData.status) && (
              <div className="py-6 border-b border-zinc-100">
                <div className="relative">
                  {/* Background Track */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-100 -translate-y-1/2 z-0 rounded-full" />
                  
                  {/* Active Track */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full transition-all duration-500" 
                    style={{ 
                      width: getStatusStep(orderData.status) === 1 ? '16%' : getStatusStep(orderData.status) === 2 ? '50%' : '100%' 
                    }}
                  />

                  {/* Nodes */}
                  <div className="relative flex justify-between items-center z-10">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${getStatusStep(orderData.status) >= 1 ? 'bg-primary border-primary text-white' : 'bg-white border-zinc-200 text-zinc-400'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2.5 text-zinc-900">Placed</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${getStatusStep(orderData.status) >= 2 ? 'bg-primary border-primary text-white' : 'bg-white border-zinc-200 text-zinc-400'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2.5 text-zinc-900">Processing</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${getStatusStep(orderData.status) >= 3 ? 'bg-primary border-primary text-white' : 'bg-white border-zinc-200 text-zinc-400'}`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2.5 text-zinc-900">Dispatched</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Courier Tracking Info */}
            {orderData.tracking && orderData.tracking.length > 0 ? (
              <div className="mt-6 p-5 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Courier Tracking Details</h3>
                    <p className="text-zinc-500 text-xs mt-1">
                      Carrier: <span className="font-semibold text-zinc-800">{orderData.tracking[0].tracking_provider || "Standard Courier"}</span>
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Tracking Code: <span className="font-mono font-semibold text-zinc-800">{orderData.tracking[0].tracking_number}</span>
                    </p>
                  </div>
                </div>
                {orderData.tracking[0].tracking_link ? (
                  <a 
                    href={orderData.tracking[0].tracking_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:text-primary transition-colors shadow-xs"
                  >
                    Track Shipment <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400 font-semibold italic">Tracking code provided by email</span>
                )}
              </div>
            ) : orderData.status === 'completed' ? (
              <div className="mt-6 p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                <p className="text-sm font-medium text-zinc-600">
                  This order has been completed and dispatched. A tracking code was sent to <span className="font-semibold">{email}</span>. If you did not receive it, please contact customer support.
                </p>
              </div>
            ) : null}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Details */}
            <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 border-b border-zinc-50 pb-4 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-zinc-400" /> Delivery Address
                </h3>
                <address className="not-italic text-sm text-zinc-600 space-y-1">
                  <p className="font-bold text-zinc-900">{orderData.shipping?.first_name} {orderData.shipping?.last_name}</p>
                  {orderData.shipping?.company && <p>{orderData.shipping.company}</p>}
                  <p>{orderData.shipping?.address_1}</p>
                  {orderData.shipping?.address_2 && <p>{orderData.shipping.address_2}</p>}
                  <p>{orderData.shipping?.city}, {orderData.shipping?.postcode}</p>
                  <p>{orderData.shipping?.country}</p>
                </address>
              </div>
            </div>

            {/* Order Value Details */}
            <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 border-b border-zinc-50 pb-4 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-zinc-400" /> Payment Summary
                </h3>
                <div className="space-y-2.5 text-sm text-zinc-600">
                  <div className="flex justify-between">
                    <span>Total Amount Charged</span>
                    <span className="font-extrabold text-zinc-900">
                      {orderData.currency === "GBP" ? "£" : orderData.currency}{Number(orderData.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Invoice Ref</span>
                    <span>DQP-ORD-{orderData.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Summary Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden p-6 md:p-8">
            <h3 className="text-lg font-bold text-zinc-900 border-b border-zinc-50 pb-4 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-zinc-400" /> Items in Order
            </h3>

            <div className="space-y-4">
              {orderData.line_items.map((item: any) => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-4 p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-all bg-zinc-50/30"
                >
                  {item.image ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white shrink-0 border border-zinc-100">
                      <Image src={item.image} alt={item.name} fill className="object-contain p-1" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-100 shrink-0 flex items-center justify-center text-zinc-400 border border-zinc-200">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-zinc-900 line-clamp-2 leading-snug">{item.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-zinc-900">
                      {orderData.currency === "GBP" ? "£" : orderData.currency}{(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
