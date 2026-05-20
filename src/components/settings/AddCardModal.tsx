"use client";

import { useState, useEffect, type FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSetupIntent, savePaymentMethod } from "@/lib/wallet-api";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AddCardForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (setupError) {
        throw new Error(setupError.message || "Failed to verify card.");
      }

      if (!setupIntent.payment_method) {
        throw new Error("Payment method ID missing after successful setup.");
      }

      const pmId = typeof setupIntent.payment_method === 'string' 
        ? setupIntent.payment_method 
        : setupIntent.payment_method.id;

      await savePaymentMethod(pmId);
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <CardElement 
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#18181b', // zinc-900
                '::placeholder': {
                  color: '#a1a1aa', // zinc-400
                },
                iconColor: '#71717a', // zinc-500
              },
              invalid: {
                color: '#e11d48', // rose-600
                iconColor: '#e11d48',
              },
            },
            hidePostalCode: true,
          }} 
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-zinc-500 justify-center pb-2">
        <Lock className="h-3 w-3" />
        <span>Your card details are securely encrypted.</span>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-zinc-900 text-white hover:bg-zinc-800" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Securing Details...
          </>
        ) : (
          "Save Card"
        )}
      </Button>
    </form>
  );
}

export function AddCardModal({ open, onOpenChange, onSuccess }: AddCardModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setClientSecret(null);
      setError(null);
      setIsInitializing(true);
      
      createSetupIntent()
        .then((data) => {
          setClientSecret(data.client_secret);
        })
        .catch((err) => {
          setError(err.message || "Failed to initialize secure connection.");
        })
        .finally(() => {
          setIsInitializing(false);
        });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-zinc-500" />
            Add New Card
          </DialogTitle>
          <DialogDescription>
            Enter your card details below. We do not store your full card number on our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">Establishing secure connection...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <AddCardForm 
                clientSecret={clientSecret} 
                onSuccess={() => {
                  onOpenChange(false);
                  onSuccess();
                }} 
              />
            </Elements>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
