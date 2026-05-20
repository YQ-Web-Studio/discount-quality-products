"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPaymentTokens, deletePaymentToken, type PaymentToken } from "@/lib/wallet-api";
import { AddCardModal } from "./AddCardModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WalletSection() {
  const [tokens, setTokens] = useState<PaymentToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<PaymentToken | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    try {
      const data = await fetchPaymentTokens();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment methods");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDelete() {
    if (!confirmingDelete) return;
    
    const id = confirmingDelete.id;
    setDeletingId(id);
    setError(null);
    setConfirmingDelete(null); // Close modal
    
    try {
      await deletePaymentToken(id);
      setTokens(tokens.filter(t => t.id !== id));
      // Safety refresh to confirm server state
      setTimeout(() => loadTokens(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment method");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900">Saved Payment Methods</h3>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add new card
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white py-12 text-center">
          <CreditCard className="h-8 w-8 text-zinc-200" />
          <h4 className="mt-4 text-sm font-bold text-zinc-900">No saved cards</h4>
          <p className="mt-1 text-xs text-zinc-500">
            You can save a new card securely during checkout.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tokens.map((token) => (
            <li 
              key={token.id} 
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-12 items-center justify-center rounded border border-zinc-100 bg-zinc-50">
                  <CreditCard className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 uppercase">
                    {token.brand} &bull;&bull;&bull;&bull; {token.last4}
                  </p>
                  <p className="text-xs text-zinc-500">Expires {token.expiry}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmingDelete(token)}
                disabled={deletingId === token.id}
                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Delete ${token.brand} ending in ${token.last4}`}
              >
                {deletingId === token.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddCardModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onSuccess={() => {
          setIsLoading(true);
          loadTokens();
        }} 
      />

      {/* Custom Delete Confirmation Modal */}
      <Dialog open={!!confirmingDelete} onOpenChange={(open) => !open && setConfirmingDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Remove Card?
            </DialogTitle>
            <DialogDescription className="pt-2 text-zinc-600">
              Are you sure you want to remove your <span className="font-bold text-zinc-900 uppercase">{confirmingDelete?.brand}</span> ending in <span className="font-bold text-zinc-900">{confirmingDelete?.last4}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(null)}
              className="flex-1 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800"
            >
              Delete Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
