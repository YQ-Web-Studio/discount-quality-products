"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WooCommerceCustomer } from "@/lib/woocommerce";
import type { AuthUser } from "@/lib/auth-types";

interface IdentityFormProps {
  customer: WooCommerceCustomer | null;
  activeUser: AuthUser | null;
}

export function IdentityForm({ customer, activeUser }: IdentityFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(customer?.first_name || activeUser?.name?.split(' ')[0] || "");
  const [lastName, setLastName] = useState(customer?.last_name || activeUser?.name?.split(' ').slice(1).join(' ') || "");
  const [email, setEmail] = useState(customer?.email || activeUser?.email || "");
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/account/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not update your identity details.");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        setIsEditing(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900">Personal Details</h3>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">First name</label>
              <p className="mt-1 text-sm font-medium text-zinc-900">{firstName || "—"}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Last name</label>
              <p className="mt-1 text-sm font-medium text-zinc-900">{lastName || "—"}</p>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email address</label>
            <p className="mt-1 text-sm font-medium text-zinc-900">{email || "—"}</p>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                First name
              </label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                disabled={isSaving}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Last name
              </label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                disabled={isSaving}
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Email address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              disabled={isSaving}
              className="bg-white"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 transition-all" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                  Saved!
                </>
              ) : (
                "Save Details"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setFirstName(customer?.first_name || activeUser?.name?.split(' ')[0] || "");
                setLastName(customer?.last_name || activeUser?.name?.split(' ').slice(1).join(' ') || "");
                setEmail(customer?.email || activeUser?.email || "");
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
