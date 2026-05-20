"use server";

import sanitizeHtml from "sanitize-html";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number, resetTime: number }>();

export async function submitContactForm(formData: FormData) {
  // 1. Rate Limiting Check
  const now = Date.now();
  const globalKey = "global_rate_limit";
  let limitData = rateLimiter.get(globalKey);

  if (limitData && now < limitData.resetTime) {
    if (limitData.count >= 2) {
      // Simulate generic error on rate limit hit
      return { status: "error", message: "Something went wrong. Please try again later." };
    }
    limitData.count++;
  } else {
    // Reset or instantiate
    rateLimiter.set(globalKey, { count: 1, resetTime: now + 60000 }); // 1 minute window
  }

  // 2. Honeypot Check
  const honeypot = formData.get("honey_pot");
  if (honeypot && honeypot.toString().length > 0) {
    // Silently reject if bot filled honeypot
    return { status: "error", message: "Something went wrong. Please try again later." };
  }

  // 3. Turnstile Validation
  const turnstileToken = formData.get("cf-turnstile-response")?.toString();
  if (!turnstileToken) {
    return { status: "error", message: "Security verification failed. Please try again." };
  }

  const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
  try {
    const cfResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(SECRET_KEY)}&response=${encodeURIComponent(turnstileToken)}`,
    });

    const cfData = await cfResponse.json();
    if (!cfData.success) {
      console.error("Turnstile verification failed:", cfData);
      return { status: "error", message: "Security verification failed. Please refresh the page and try again." };
    }
  } catch (error) {
    console.error("Turnstile API error:", error);
    return { status: "error", message: "Something went wrong verifying the security challenge." };
  }

  // 4. Input Sanitisation
  const rawMessage = formData.get("message")?.toString() || "";
  const name = sanitizeHtml(formData.get("name")?.toString() || "");
  const email = sanitizeHtml(formData.get("email")?.toString() || "");
  const subject = sanitizeHtml(formData.get("subject")?.toString() || "");
  const message = sanitizeHtml(rawMessage, {
    allowedTags: [], // Strip all HTML to prevent XSS
    allowedAttributes: {},
  });

  if (!name || !email || !subject || !message) {
    return { status: "error", message: "All fields are required." };
  }

  console.log("Valid Secure Contact Submission received:", { name, email, subject, message });

  // 5. Send Email via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: 'Contact Form <noreply@discountqualityproducts.co.uk>',
      to: 'yusufq2004@gmail.com',
      replyTo: email,
      subject: `New Enquiry: ${subject}`,
      text: `You have received a new message from the contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    if (error) {
      console.error("Resend API error:", error);
      // Fallback message to user if Resend configuration (like unverified domain) fails
      return { status: "error", message: "Message could not be sent due to a server error. Please try again later." };
    }

    console.log("Email sent successfully via Resend. ID:", data?.id);
  } catch (err) {
    console.error("Critical Resend exception:", err);
    return { status: "error", message: "Message could not be sent due to a server error. Please try again later." };
  }

  return { status: "success", message: "Enquiry received. We'll be in touch shortly!" };
}
