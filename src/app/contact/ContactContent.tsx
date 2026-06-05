"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { MapPin, Mail, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@marsidev/react-turnstile";
import { submitContactForm } from "@/lib/actions/contact";
import Link from "next/link";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function ContactContent() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstilePassed, setTurnstilePassed] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    
    // Server action call
    try {
      const result = await submitContactForm(formData);
      
      if (result.status === "error") {
        setErrorMsg(result.message);
      } else {
        setSuccess(true);
        formRef.current?.reset();
      }
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] 2xl:max-w-[1750px] px-8 py-24 md:px-12 2xl:px-16">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24"
      >
        {/* Left Column: Contact Information */}
        <div className="flex flex-col">
          <motion.h1 variants={itemVariants} className="flex flex-col mb-8">
            <span className="text-5xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-primary leading-none">CONTACT.</span>
            <span className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-zinc-400 mt-3 ml-1">SUPPORT & ENQUIRIES</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-lg text-zinc-600 mb-14 max-w-md leading-relaxed">
            For professional sales inquiries, technical assistance, and post-purchase support, our team is readily available.
          </motion.p>

          <div className="flex flex-col gap-10 mb-14">
            <motion.div variants={itemVariants} className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="flex flex-col pt-1">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Headquarters</span>
                <span className="text-base font-bold text-zinc-900">Discount Quality Products Ltd.</span>
                <span className="text-base text-zinc-600 mt-1">256 London Road</span>
                <span className="text-base text-zinc-600">Westcliff-on-Sea, Essex</span>
                <span className="text-base text-zinc-600">SS0 7JG</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <div className="flex flex-col pt-1">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Email Support</span>
                <a href="mailto:sales@fncomputers.com" className="text-base font-bold text-zinc-900 hover:text-primary transition-colors mt-1">
                  sales@fncomputers.com
                </a>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="h-6 w-6" />
              </div>
              <div className="flex flex-col pt-1">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Direct Line</span>
                <a href="tel:+441702339033" className="text-base font-bold text-zinc-900 hover:text-primary transition-colors mt-1">
                  +44 1702 339033
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Enquiry Form */}
        <motion.div variants={itemVariants} className="flex items-start justify-center lg:justify-end">
          <div className="w-full lg:max-w-2xl rounded-3xl bg-white border border-zinc-200 shadow-2xl p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-cyan-500"></div>
            
            <div className="mb-4 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={success ? "success-header" : "idle-header"}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-primary leading-none">
                      {success ? "SENT." : "SEND A MESSAGE"}
                    </h2>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
                  <p className="text-sm text-zinc-500">
                    {success 
                      ? "We've received your enquiry and will be in touch shortly." 
                      : "Fill out the form below and we'll route your enquiry to the correct department."
                    }
                  </p>
            <div className="relative flex-1">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                      <ShieldCheck className="h-10 w-10 text-emerald-500" />
                    </div>
                    
                    <Link href="/">
                      <Button 
                        className="h-12 px-10 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold transition-all shadow-sm"
                        onClick={() => setSuccess(false)}
                      >
                        Return to Home
                      </Button>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.form 
                    key="form"
                    ref={formRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleSubmit} 
                    className="flex flex-col gap-5"
                  >
                    {errorMsg && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-2">
                        <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
                      </div>
                    )}

                    {/* Honeypot Field */}
                    <input 
                      type="text" 
                      name="honey_pot" 
                      tabIndex={-1} 
                      className="opacity-0 absolute -z-10 h-0 w-0" 
                      autoComplete="off" 
                      aria-hidden="true" 
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Full Name</label>
                        <Input id="name" name="name" required placeholder="Jane Doe" className="h-11 rounded-xl bg-zinc-50/50 shadow-sm border-zinc-200 focus-visible:ring-primary focus-visible:border-primary text-sm" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Email Address</label>
                        <Input id="email" name="email" type="email" required placeholder="jane@example.com" className="h-11 rounded-xl bg-zinc-50/50 shadow-sm border-zinc-200 focus-visible:ring-primary focus-visible:border-primary text-sm" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Subject</label>
                      <Input id="subject" name="subject" required placeholder="Order Enquiry #12345" className="h-11 rounded-xl bg-zinc-50/50 shadow-sm border-zinc-200 focus-visible:ring-primary focus-visible:border-primary text-sm" />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="message" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Message</label>
                      <Textarea id="message" name="message" required placeholder="How can we assist you today?" className="min-h-[100px] lg:min-h-[120px] resize-none rounded-xl bg-zinc-50/50 shadow-sm border-zinc-200 focus-visible:ring-primary focus-visible:border-primary text-sm p-4" />
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <input
                        type="checkbox"
                        id="contact-terms-agreement"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                        required
                      />
                      <label htmlFor="contact-terms-agreement" className="text-sm text-zinc-600 leading-snug">
                        I have read and agree to the website{' '}
                        <Link href="/terms" target="_blank" className="font-semibold text-primary hover:underline">
                          Terms and Conditions
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">
                          Privacy Policy
                        </Link>.
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                      <div className="shrink-0 scale-90 origin-left">
                        <Turnstile 
                          siteKey={
                            process.env.NODE_ENV === 'development' 
                              ? "1x00000000000000000000AA" // Cloudflare testing key for localhost
                              : (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA")
                          } 
                          options={{ theme: "light" }}
                          onSuccess={() => setTurnstilePassed(true)}
                          onError={() => setTurnstilePassed(false)}
                          onExpire={() => setTurnstilePassed(false)}
                        />
                      </div>

                      <div className="flex-1 w-full flex flex-col gap-3">
                        <Button 
                          type="submit" 
                          disabled={loading || !turnstilePassed || !agreedToTerms}
                          className="group h-12 rounded-xl w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {loading ? (
                            <span className="flex items-center gap-3">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </span>
                          ) : !turnstilePassed ? (
                            "Verify to Send"
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                        <p className="text-[9px] text-center text-zinc-400 font-medium flex items-center justify-center gap-1.5 uppercase tracking-wider">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          256-bit SSL Secure
                        </p>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
