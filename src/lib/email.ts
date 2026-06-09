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
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email sending skipped.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
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
