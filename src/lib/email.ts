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
  from = 'Discount Quality Products <sales@discountproducts.co.uk>',
  replyTo = 'sales@discountproducts.co.uk',
}: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email sending skipped.");
    return { success: false, error: "Missing API Key" };
  }

  // Intercept all outgoing emails to redirect them to the client's testing mailbox
  const actualRecipient = 'sales@fncomputers.com';
  console.log(`[Email Interceptor] Original recipient: ${to}. Redirected to: ${actualRecipient}`);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: actualRecipient,
      subject: `${subject} (Redirected from: ${Array.isArray(to) ? to.join(', ') : to})`,
      react,
      replyTo,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error };
    }

    console.log(`Email sent successfully to ${actualRecipient}. ID:`, data?.id);
    return { success: true, data };
  } catch (err) {
    console.error("Critical Resend exception:", err);
    return { success: false, error: err };
  }
}
