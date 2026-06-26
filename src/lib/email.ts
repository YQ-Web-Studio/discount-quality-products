import { Resend } from 'resend';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_to_pass_build");

interface SendEmailParams {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  from = 'Discount Quality Products <noreply@mail.discountproducts.co.uk>',
  replyTo = 'sales@fncomputers.com',
}: SendEmailParams) {
  // Enforce filter to block any emails destined to wpengine.local domains
  const recipients = Array.isArray(to) ? to : [to];
  const filteredRecipients = recipients.filter(
    (email) => !email.toLowerCase().includes("wpengine.local")
  );

  if (filteredRecipients.length === 0) {
    console.log(
      `[Email] Skipped sending email because all recipients were filtered out (wpengine.local check). Subject: ${subject}`
    );
    return { success: true, data: { id: "skipped-wpengine-local" } };
  }

  const finalTo = filteredRecipients.length === 1 ? filteredRecipients[0] : filteredRecipients;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email sending skipped.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: finalTo,
      subject,
      react,
      replyTo,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error };
    }

    console.log(`Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}. ID:`, data?.id);
    return { success: true, data };
  } catch (err) {
    console.error("Critical Resend exception:", err);
    return { success: false, error: err };
  }
}
