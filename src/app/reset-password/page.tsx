"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import {
  Lock,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  ShoppingBag
} from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const key = searchParams.get("key") || "";
  const login = searchParams.get("login") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [confirmInvalid, setConfirmInvalid] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSuccess && countdown === 0) {
      router.push("/login");
    }
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, router]);

  const isValidParams = Boolean(key && login);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || !confirmPassword) {
      setError("Password fields are required.");
      return;
    }

    const isPassValid = password.length >= 8 && 
                        /[A-Z]/.test(password) && 
                        /[a-z]/.test(password) && 
                        /[0-9]/.test(password);

    if (!isPassValid) {
      setPasswordInvalid(true);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmInvalid(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPasswordInvalid(false);
    setConfirmInvalid(false);

    try {
      await resetPassword(key, login, password);
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset password. The link may be expired or invalid."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isSubmitting;

  if (!isValidParams) {
    return (
      <div className="text-center space-y-6 animate-in fade-in duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-8 ring-rose-50/50">
          <Lock className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Invalid Reset Link</h3>
        <p className="text-sm font-medium leading-relaxed text-zinc-500">
          This password reset link is invalid or incomplete. Please request a new recovery link from the login page.
        </p>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center h-11 rounded-2xl bg-zinc-900 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-lg outline-none"
        >
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      {isSuccess ? (
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50">
            <ShieldCheck className="h-8 w-8 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 tracking-tight">Password Updated!</h3>
          <p className="text-sm font-medium leading-relaxed text-zinc-500">
            Your password has been successfully reset. You will be redirected to the sign-in page in{" "}
            <span className="font-bold text-emerald-600">{countdown} seconds</span>...
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center h-11 rounded-2xl bg-zinc-900 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-lg outline-none"
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form className="space-y-8 xl:space-y-4 2xl:space-y-8" onSubmit={handleSubmit}>
          {/* New Password Field */}
          <div className="space-y-3 xl:space-y-1.5 2xl:space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
              New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary xl:left-4 xl:h-4 xl:w-4 2xl:left-5 2xl:h-5 2xl:w-5" />
              <input
                autoComplete="new-password"
                className="h-14 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 pl-14 pr-12 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 xl:h-11 xl:pl-11 xl:text-xs 2xl:h-14 2xl:pl-14 2xl:text-sm"
                name="password"
                placeholder="••••••••••••"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordInvalid(false);
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5 xl:h-4 xl:w-4 2xl:h-5 2xl:w-5" /> : <Eye className="h-5 w-5 xl:h-4 xl:w-4 2xl:h-5 2xl:w-5" />}
              </button>
            </div>
            <p className={cn(
              "mt-2 text-[11px] font-medium leading-relaxed transition-colors duration-200",
              passwordInvalid ? "text-rose-600 font-semibold" : "text-zinc-400"
            )}>
              Password must be at least 8 characters and include uppercase, lowercase, and a number.
            </p>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-3 xl:space-y-1.5 2xl:space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
              Confirm New Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary xl:left-4 xl:h-4 xl:w-4 2xl:left-5 2xl:h-5 2xl:w-5" />
              <input
                autoComplete="new-password"
                className="h-14 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 pl-14 pr-6 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 xl:h-11 xl:pl-11 xl:text-xs 2xl:h-14 2xl:pl-14 2xl:text-sm"
                name="confirm_password"
                placeholder="••••••••••••"
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmInvalid(false);
                }}
              />
            </div>
            {confirmInvalid && (
              <p className="mt-2 text-[11px] font-semibold text-rose-600">
                Passwords do not match.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 animate-in fade-in duration-200">
              {error}
            </p>
          )}

          <button
            className="group relative h-14 w-full overflow-hidden rounded-2xl bg-primary text-sm font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-primary/90 active:scale-[0.98] shadow-2xl shadow-primary/20 disabled:opacity-50 xl:h-11 xl:text-xs 2xl:h-14 2xl:text-sm"
            disabled={busy}
            type="submit"
          >
            <span className={cn("relative z-10 flex items-center justify-center gap-3", busy && "opacity-0")}>
              Update Password
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </button>
        </form>
      )}
    </>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading secure link session...</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#fafafa] py-24 px-4 sm:px-6 lg:px-8 xl:py-12 2xl:py-24 flex items-center justify-center">
      {/* Decorative background grid and shapes */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      <div className="relative w-full max-w-lg z-10">
        <div className="mb-12 text-center xl:mb-6 2xl:mb-12">

          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 sm:text-5xl xl:text-3xl 2xl:text-5xl">
            Reset Password
          </h1>
          <p className="mt-4 text-sm font-medium text-zinc-500 leading-relaxed xl:mt-2 xl:text-xs 2xl:mt-4 2xl:text-sm">
            Choose a new, secure password for your account to complete the recovery.
          </p>
        </div>

        <div className="relative rounded-[3rem] border border-white bg-white/60 p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] backdrop-blur-3xl sm:p-12 ring-1 ring-zinc-200/50 xl:rounded-[2rem] xl:p-8 2xl:rounded-[3rem] 2xl:p-12">
          <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 xl:mt-6 2xl:mt-10">
          Secure Encrypted Portal
        </p>
      </div>
    </section>
  );
}
