import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import React from "react";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";

export async function GET() {
  console.log("[test-resend] Triggering direct Resend test to sales@fncomputers.com...");
  
  try {
    const emailResult = await sendEmail({
      to: "sales@fncomputers.com",
      subject: "Production Direct Resend Test",
      react: React.createElement(OrderConfirmationEmail, {
        customerName: "Test Customer",
        orderNumber: "TEST-PROD-123",
        orderDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: [
          {
            id: "1",
            title: "Test Adapter Product",
            quantity: 1,
            price: "£10.00",
            thumbnail: "",
          }
        ],
        subtotal: "£10.00",
        vat: "£2.00",
        shipping: "£0.00",
        total: "£12.00",
        shippingAddress: {
          name: "Test Customer",
          line1: "123 Test Street",
          city: "London",
          postcode: "EC1A 1BB",
          country: "United Kingdom",
        },
        shippingMethod: "Free Delivery",
      }),
    });

    return NextResponse.json({
      success: emailResult.success,
      error: emailResult.error || null,
      data: (emailResult as any).data || null,
      apiKeyPresent: !!process.env.RESEND_API_KEY,
      apiKeySnippet: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.slice(0, 7)}...${process.env.RESEND_API_KEY.slice(-5)}` : "None"
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || err,
    }, { status: 500 });
  }
}
