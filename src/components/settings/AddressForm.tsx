"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WooCommerceAddress, WooCommerceCustomer } from "@/lib/woocommerce";

interface AddressFormProps {
  type: "billing" | "shipping";
  customer: WooCommerceCustomer | null;
}

export function AddressForm({ type, customer }: AddressFormProps) {
  const router = useRouter();
  const initialAddress = customer ? customer[type] : null;

  const [address1, setAddress1] = useState(initialAddress?.address_1 || "");
  const [address2, setAddress2] = useState(initialAddress?.address_2 || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [county, setCounty] = useState(initialAddress?.state || "");
  const [postcode, setPostcode] = useState(initialAddress?.postcode || "");
  const [phone, setPhone] = useState(initialAddress?.phone || "");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const title = type === "billing" ? "Billing Address" : "Shipping Address";

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
          [type]: {
            address_1: address1,
            address_2: address2,
            city: city,
            state: county,
            postcode: postcode,
            country: "GB",
            phone: phone,
          }
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || `Could not update your ${type} address.`);
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
          <MapPin className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
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
        <div className="space-y-4 text-sm font-medium text-zinc-900">
          {!address1 && !city ? (
            <p className="text-zinc-500 font-normal">No address provided.</p>
          ) : (
            <>
              <p>
                {address1}
                {address2 && <><br />{address2}</>}
                <br />
                {city}
                {county && <><br />{county}</>}
                <br />
                {postcode}
              </p>
              {type === "billing" && phone && (
                <div className="pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">Mobile Number</label>
                  <p>{phone}</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Address Line 1
            </label>
            <Input
              type="text"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="Street address"
              required
              disabled={isSaving}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Address Line 2 (Optional)
            </label>
            <Input
              type="text"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="Apartment, suite, unit etc."
              disabled={isSaving}
              className="bg-white"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Town / City
              </label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Town or City"
                required
                disabled={isSaving}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                County
              </label>
              <Input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={isSaving}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Postcode
              </label>
              <Input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. SW1A 1AA"
                required
                disabled={isSaving}
                className="bg-white uppercase"
              />
            </div>
          </div>

          {type === "billing" && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Mobile Number
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 07700 900000"
                disabled={isSaving}
                className="bg-white"
              />
            </div>
          )}

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
                "Save Address"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setAddress1(initialAddress?.address_1 || "");
                setAddress2(initialAddress?.address_2 || "");
                setCity(initialAddress?.city || "");
                setCounty(initialAddress?.state || "");
                setPostcode(initialAddress?.postcode || "");
                setPhone(initialAddress?.phone || "");
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
