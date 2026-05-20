"use client";

import { useState } from "react";
import { getOrderByLookup, submitReturnRequest } from "./actions";
import { Search, Package, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import Image from "next/image";

export function ReturnsForm() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await getOrderByLookup(orderId, email);
    
    if (result.success && result.order) {
      setOrderData(result.order);
      setStep(2);
    } else {
      setError(result.error || "Failed to lookup order.");
    }
    
    setLoading(false);
  }

  function toggleItem(itemId: number) {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  }

  function handleContinueToReason() {
    if (selectedItems.size === 0) {
      setError("Please select at least one item to return.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason for the return.");
      return;
    }

    setError(null);
    setLoading(true);

    const itemsToReturn = orderData.line_items.filter((item: any) => selectedItems.has(item.id));
    
    const returnData = {
      items: itemsToReturn,
      reason,
      comments
    };

    const result = await submitReturnRequest(orderData.id, returnData, email);
    
    if (result.success) {
      setStep(4);
    } else {
      setError(result.error || "Failed to submit return request.");
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-zinc-50 border-b border-zinc-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-primary' : 'text-zinc-400'}`}>1. Lookup</span>
          <ChevronRight className="w-4 h-4 text-zinc-300" />
          <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-primary' : 'text-zinc-400'}`}>2. Items</span>
          <ChevronRight className="w-4 h-4 text-zinc-300" />
          <span className={`text-xs font-bold uppercase tracking-wider ${step >= 3 ? 'text-primary' : 'text-zinc-400'}`}>3. Reason</span>
        </div>
      </div>

      <div className="p-8 md:p-12">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800 border border-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* STEP 1: LOOKUP */}
        {step === 1 && (
          <form onSubmit={handleLookup} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Find Your Order</h2>
              <p className="text-zinc-500 text-sm">Enter your order ID and the email address used during checkout to start your return.</p>
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
                  placeholder="e.g. 12345"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-zinc-700">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold tracking-tight text-white shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] focus-visible:ring-primary disabled:cursor-wait disabled:opacity-50"
            >
              {loading ? "Searching..." : "Lookup Order"}
              {!loading && <Search className="w-5 h-5" />}
            </button>
          </form>
        )}

        {/* STEP 2: ITEMS */}
        {step === 2 && orderData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Select Items to Return</h2>
              <p className="text-zinc-500 text-sm">Order #{orderData.id} • Placed on {new Date(orderData.date_created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {(orderData.status === 'return-req' || orderData.status === 'refunded') && (
              <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4 text-zinc-800 border border-primary/20">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm font-medium leading-relaxed">A return has already been requested or processed for this order. If you need further assistance, please contact support.</p>
              </div>
            )}

            {orderData.status === 'processing' && (
              <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4 text-zinc-800 border border-primary/20">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm font-medium leading-relaxed">This order is still being processed. You can request a return once it has been dispatched.</p>
              </div>
            )}

            <div className={`space-y-3 ${['return-req', 'refunded', 'processing'].includes(orderData.status) ? 'opacity-70 pointer-events-none grayscale-[20%]' : ''}`}>
              {orderData.line_items.map((item: any) => (
                <label 
                  key={item.id} 
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedItems.has(item.id) ? 'border-primary bg-primary/5' : 'border-zinc-200 hover:border-zinc-300'}`}
                >
                  <div className="flex items-center h-full pt-1">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-zinc-300 text-primary focus:ring-primary accent-primary"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                  </div>
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
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl px-6 py-3.5 text-base font-semibold tracking-tight transition-all duration-200 border-2 bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-[0.98]"
              >
                Back
              </button>
              <button
                onClick={handleContinueToReason}
                disabled={['return-req', 'refunded', 'processing'].includes(orderData.status)}
                className="flex-[2] flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold tracking-tight text-white shadow-md transition-all duration-200 bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:active:scale-100"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REASONING */}
        {step === 3 && (
          <form onSubmit={handleSubmitReturn} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Reason for Return</h2>
              <p className="text-zinc-500 text-sm">Please let us know why you are returning these items so we can process your request quickly.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-bold text-zinc-700">Reason</label>
                <select
                  id="reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Faulty or damaged">Faulty or damaged</option>
                  <option value="Incorrect item received">Incorrect item received</option>
                  <option value="No longer required">No longer required</option>
                  <option value="Item does not match description">Item does not match description</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="comments" className="text-sm font-bold text-zinc-700">Additional Comments (Optional)</label>
                <textarea
                  id="comments"
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide any further details to help us authorise your return..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 rounded-xl px-6 py-3.5 text-base font-semibold tracking-tight transition-all duration-200 border-2 bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold tracking-tight text-white shadow-md transition-all duration-200 bg-primary hover:bg-primary/90 hover:shadow-lg active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Return Request"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="text-center py-8 animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-3">Return Requested</h2>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto leading-relaxed">
              We've successfully received your return request. Our team will review the details and email you shortly with instructions for sending your items back to our catalogue facility.
            </p>
            <button
              onClick={() => window.location.href = "/"}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-base font-semibold tracking-tight transition-all duration-200 border-2 bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-[0.98]"
            >
              Return to Homepage
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
