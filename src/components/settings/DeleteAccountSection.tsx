"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { deleteAccount } from "@/lib/auth-api";

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not delete your account right now.";
}

export function DeleteAccountSection() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialogState() {
    setCurrentPassword("");
    setConfirmationText("");
    setError(null);
    setIsDeleting(false);
  }

  function openDialog() {
    setIsDialogOpen(true);
    setError(null);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    resetDialogState();
  }

  async function handleDeleteAccount() {
    if (confirmationText.trim().toUpperCase() !== "DELETE") {
      setError("Please type DELETE to continue.");
      return;
    }

    if (!currentPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteAccount(currentPassword);
      await logout().catch(() => undefined);
      closeDialog();
      router.replace("/");
      router.refresh();
    } catch (deleteError) {
      setError(getFriendlyErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm">
        <div className="border-b border-rose-100 bg-rose-50/70 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-700">
                Danger zone
              </p>
              <h3 className="mt-1 text-base font-bold text-zinc-900">Delete account</h3>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            This will permanently close your customer account. If you are sure you want to continue, we will ask you to confirm your password before the account is removed.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="destructive" className="sm:w-auto" onClick={openDialog}>
              <Trash2 className="h-4 w-4" />
              Delete my account
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && isDeleting) {
            return;
          }

          if (open) {
            setIsDialogOpen(true);
            return;
          }

          closeDialog();
        }}
      >
        <DialogContent className="max-w-lg border border-rose-200 bg-white" showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle className="text-zinc-900">Delete your account?</DialogTitle>
            <DialogDescription className="text-zinc-600">
              This action cannot be undone. You will lose access to your saved account details and saved products when the account is removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Please type <span className="font-bold">DELETE</span> and enter your current password to continue.
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                Type DELETE
              </label>
              <Input
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                Current password
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                disabled={isDeleting}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-rose-100 bg-rose-50/60">
            <Button variant="outline" onClick={closeDialog} disabled={isDeleting}>
              Keep my account
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                isDeleting ||
                confirmationText.trim().toUpperCase() !== "DELETE" ||
                !currentPassword.trim()
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting account
                </>
              ) : (
                "Delete account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
