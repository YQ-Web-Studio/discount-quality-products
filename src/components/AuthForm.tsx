"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Loader2, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  Zap, 
  Star, 
  Heart,
  ChevronRight,
  TrendingDown,
  ShoppingBag,
  Package,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { forgotPassword } from "@/lib/auth-api";

type AuthFormMode = "login" | "register" | "forgot";

interface AuthFormProps {
  mode: AuthFormMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register, error: authError, isLoading, sessionStatus } = useAuth();
  const [currentMode, setCurrentMode] = useState<AuthFormMode>(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegisterMode = currentMode === "register";
  const isForgotMode = currentMode === "forgot";
  const error = localError || authError;

  const headline = isForgotMode
    ? "Recover Password"
    : isRegisterMode
      ? "Create Account"
      : "Sign In";

  const subheading = isForgotMode
    ? "Enter your email address and we will send you a secure link to reset your password."
    : isRegisterMode
      ? "Join our community and start saving on quality products today."
      : "Sign in to your account to view your orders and wishlist.";

  useEffect(() => {
    if (!isLoading && sessionStatus === "authenticated") {
      router.replace("/account");
    }
  }, [isLoading, router, sessionStatus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setLocalError(null);
    setPasswordInvalid(false);

    try {
      if (isForgotMode) {
        const email = String(formData.get("email") || "").trim();
        await forgotPassword(email);
        setIsForgotSuccess(true);
      } else if (isRegisterMode) {
        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const password = passwordValue;

        const isPassValid = password.length >= 8 && 
                            /[A-Z]/.test(password) && 
                            /[a-z]/.test(password) && 
                            /[0-9]/.test(password);

        if (!isPassValid) {
          setPasswordInvalid(true);
          setIsSubmitting(false);
          return;
        }

        await register(name, email, password);
        router.replace("/account");
        router.refresh();
      } else {
        const identifier = String(formData.get("identifier") || "").trim();
        const password = String(formData.get("password") || "");
        await login(identifier, password);
        router.replace("/account");
        router.refresh();
      }
    } catch (err) {
      if (isForgotMode) {
        setLocalError(err instanceof Error ? err.message : "Failed to send password reset email.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isLoading || isSubmitting;

  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#fafafa] px-4 py-12 sm:px-6 lg:px-8 lg:py-24 xl:py-12 2xl:py-24">
      {/* Dynamic Background Effects */}
      <div className="absolute -left-24 -top-24 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute -right-24 bottom-0 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.2fr] xl:gap-8 2xl:gap-12">
        {/* Brand Side: Narrative & Benefits */}
        <div className="hidden flex-col justify-between rounded-[3.5rem] bg-zinc-900 p-12 text-white shadow-2xl shadow-zinc-900/20 lg:flex overflow-hidden relative group xl:rounded-[2rem] xl:p-8 2xl:rounded-[3.5rem] 2xl:p-12">
          {/* Animated Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary/0" />
          
          <div className="relative z-10">
            <div className="mb-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-xl ring-1 ring-white/20 shadow-xl xl:mb-6 xl:h-11 xl:w-11 2xl:mb-10 2xl:h-14 2xl:w-14">
              <Star className="h-7 w-7 fill-primary text-primary xl:h-5 xl:w-5 2xl:h-7 2xl:w-7" />
            </div>
            <h2 className="text-5xl font-black tracking-tighter leading-[1.1] xl:text-3xl xl:leading-[1.1] 2xl:text-5xl 2xl:leading-[1.1]">
              Shop Smarter. <br />
              <span className="text-primary">Save Better.</span>
            </h2>
            <p className="mt-8 max-w-sm text-lg font-medium leading-relaxed text-zinc-400 xl:mt-4 xl:text-sm xl:max-w-xs 2xl:mt-8 2xl:text-lg 2xl:max-w-sm">
              Create an account to unlock a seamless shopping experience and manage your quality products with ease.
            </p>
          </div>

          <div className="relative z-10 grid gap-8 mt-12 xl:gap-4 xl:mt-6 2xl:gap-8 2xl:mt-12">
            {[
              { icon: Heart, title: "Saved Items", desc: "Build your personal wishlist and keep track of all the products you love." },
              { icon: Package, title: "Order History", desc: "View and manage all your past purchases and receipts in one secure place." },
              { icon: Zap, title: "Device Sync", desc: "Access your account and saved items seamlessly across all your devices." },
            ].map((benefit) => (
              <div key={benefit.title} className="flex gap-5 group/item xl:gap-3 2xl:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-white ring-1 ring-white/10 transition-all group-hover/item:bg-primary group-hover/item:text-white xl:h-9 xl:w-9 2xl:h-12 2xl:w-12">
                  <benefit.icon className="h-6 w-6 xl:h-4 xl:w-4 2xl:h-6 2xl:w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-white xl:text-xs 2xl:text-sm">{benefit.title}</p>
                  <p className="mt-1 text-sm text-zinc-500 leading-relaxed xl:text-[11px] xl:leading-normal 2xl:text-sm">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>


          {/* Abstract Background Shape */}
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        {/* Form Side: The Interactive Component */}
        <div className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-12 text-center lg:text-left xl:mb-6 2xl:mb-12">
              <h1 className="text-4xl font-black tracking-tighter text-zinc-900 sm:text-5xl xl:text-3xl 2xl:text-5xl">
                {headline}
              </h1>
              <p className="mt-4 text-sm font-medium text-zinc-500 leading-relaxed xl:mt-2 xl:text-xs 2xl:mt-4 2xl:text-sm">
                {subheading}
              </p>
            </div>

            <div className="relative rounded-[3rem] border border-white bg-white/60 p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] backdrop-blur-3xl sm:p-12 ring-1 ring-zinc-200/50 xl:rounded-[2rem] xl:p-8 2xl:rounded-[3rem] 2xl:p-12">
              {isForgotSuccess ? (
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50">
                    <ShieldCheck className="h-8 w-8 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Check your email</h3>
                  <p className="text-sm font-medium leading-relaxed text-zinc-500">
                    We have sent a secure password reset link to your email address. Please check your inbox and spam folder to complete the recovery.
                  </p>
                  <button
                    onClick={() => {
                      setIsForgotSuccess(false);
                      setCurrentMode("login");
                    }}
                    type="button"
                    className="w-full h-11 rounded-2xl bg-zinc-900 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-lg outline-none"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form className="space-y-8 xl:space-y-4 2xl:space-y-8" onSubmit={handleSubmit}>
                  {isRegisterMode && (
                    <div className="space-y-3 xl:space-y-1.5 2xl:space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                        Full Name
                      </label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary xl:left-4 xl:h-4 xl:w-4 2xl:left-5 2xl:h-5 2xl:w-5" />
                        <input
                          autoComplete="name"
                          className="h-14 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 pl-14 pr-6 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 xl:h-11 xl:pl-11 xl:text-xs 2xl:h-14 2xl:pl-14 2xl:text-sm"
                          name="name"
                          placeholder="Jane Smith"
                          required
                          type="text"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 xl:space-y-1.5 2xl:space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                      {isForgotMode ? "Email address" : isRegisterMode ? "Email address" : "Email or Username"}
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary xl:left-4 xl:h-4 xl:w-4 2xl:left-5 2xl:h-5 2xl:w-5" />
                      <input
                        autoComplete={isForgotMode ? "email" : isRegisterMode ? "email" : "username"}
                        className="h-14 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 pl-14 pr-6 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 xl:h-11 xl:pl-11 xl:text-xs 2xl:h-14 2xl:pl-14 2xl:text-sm"
                        name={isForgotMode ? "email" : isRegisterMode ? "email" : "identifier"}
                        placeholder={isForgotMode ? "Enter your email address" : "Enter your email"}
                        required
                        type="text"
                      />
                    </div>
                  </div>

                  {!isForgotMode && (
                    <div className="space-y-3 xl:space-y-1.5 2xl:space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                          Password
                        </label>
                        {!isRegisterMode && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentMode("forgot");
                              setLocalError(null);
                            }}
                            type="button"
                            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline outline-none"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary xl:left-4 xl:h-4 xl:w-4 2xl:left-5 2xl:h-5 2xl:w-5" />
                        <input
                          autoComplete={isRegisterMode ? "new-password" : "current-password"}
                          className="h-14 w-full rounded-2xl border border-zinc-100 bg-zinc-50/50 pl-14 pr-12 text-sm font-bold text-zinc-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 xl:h-11 xl:pl-11 xl:text-xs 2xl:h-14 2xl:pl-14 2xl:text-sm"
                          name="password"
                          placeholder="••••••••••••"
                          required
                          type={showPassword ? "text" : "password"}
                          value={isRegisterMode ? passwordValue : undefined}
                          onChange={isRegisterMode ? (e) => {
                            setPasswordValue(e.target.value);
                            setPasswordInvalid(false);
                          } : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 outline-none xl:right-4 2xl:right-5"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5 xl:h-4 xl:w-4 2xl:h-5 2xl:w-5" /> : <Eye className="h-5 w-5 xl:h-4 xl:w-4 2xl:h-5 2xl:w-5" />}
                        </button>
                      </div>
                      {isRegisterMode && (
                        <p className={cn(
                          "mt-2 text-[11px] font-medium leading-relaxed transition-colors duration-200",
                          passwordInvalid ? "text-rose-600 font-semibold animate-shake" : "text-zinc-400"
                        )}>
                          Password must be at least 8 characters and include uppercase, lowercase, and a number.
                        </p>
                      )}
                    </div>
                  )}

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
                      {isForgotMode ? "Send Recovery Link" : isRegisterMode ? "Create Account" : "Sign In"}
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

              <div className="mt-12 text-center xl:mt-6 2xl:mt-12">
                <p className="text-xs font-medium text-zinc-500">
                  {isForgotMode ? (
                    <>
                      REMEMBERED YOUR PASSWORD?{" "}
                      <button
                        onClick={() => {
                          setCurrentMode("login");
                          setLocalError(null);
                        }}
                        type="button"
                        className="font-bold text-zinc-900 hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4 outline-none"
                      >
                        SIGN IN
                      </button>
                    </>
                  ) : isRegisterMode ? (
                    <>
                      ALREADY HAVE AN ACCOUNT?{" "}
                      <button
                        onClick={() => {
                          setCurrentMode("login");
                        }}
                        type="button"
                        className="font-bold text-zinc-900 hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4 outline-none"
                      >
                        SIGN IN
                      </button>
                    </>
                  ) : (
                    <>
                      DON'T HAVE AN ACCOUNT?{" "}
                      <button
                        onClick={() => {
                          setCurrentMode("register");
                        }}
                        type="button"
                        className="font-bold text-zinc-900 hover:text-primary transition-colors underline decoration-primary/20 underline-offset-4 outline-none"
                      >
                        REGISTER NOW
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>

            <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 xl:mt-6 2xl:mt-10">
              Secure Encrypted Portal
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
