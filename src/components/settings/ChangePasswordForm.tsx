"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changeAccountPassword } from "@/lib/auth-api";

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not update your password right now.";
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Your new passwords do not match. Please try again.");
      return;
    }

    setIsSaving(true);

    try {
      await changeAccountPassword(currentPassword, newPassword);
      setSuccess("Your password has been successfully updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (changeError) {
      setError(getFriendlyErrorMessage(changeError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-bold text-zinc-900">Change password</h3>
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

      {success && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-white p-4 text-sm text-emerald-700 shadow-sm">
          {success}
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Keep your account secure by updating your password regularly. Use a strong password that you do not use elsewhere.
          </p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Current password
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
              required
              disabled={isSaving}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              New password
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Must be at least 8 characters"
              autoComplete="new-password"
              required
              disabled={isSaving}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Confirm new password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your new password"
              autoComplete="new-password"
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
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
                setSuccess(null);
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
