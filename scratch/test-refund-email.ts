import dotenv from "dotenv";
import path from "path";
import { sendEmail } from "../src/lib/email";
import React from "react";
import OrderRefundedEmail from "../src/emails/OrderRefundedEmail";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testRefundEmail() {
  console.log("Testing Refund Email sending via Resend...");
  console.log("API KEY:", process.env.RESEND_API_KEY ? "Present (ends with " + process.env.RESEND_API_KEY.slice(-5) + ")" : "Missing");

  try {
    const result = await sendEmail({
      to: "yusufq2004@gmail.com",
      subject: "Refund Issued - Order #TEST-9999",
      react: React.createElement(OrderRefundedEmail, {
        customerName: "Yusuf",
        orderNumber: "TEST-9999",
        orderDate: "06 June 2026",
        items: [
          {
            id: "1",
            title: "Test Refund Product",
            quantity: 1,
            price: "£25.00",
            thumbnail: "",
          }
        ],
        subtotal: "£25.00",
        vat: "£5.00",
        shipping: "£0.00",
        total: "£30.00",
        refundAmount: "£30.00",
        shippingAddress: {
          name: "Yusuf Qureshi",
          line1: "256 London Road",
          city: "Westcliff-on-Sea",
          postcode: "SS0 7JG",
          country: "United Kingdom",
        },
        shippingMethod: "Free Delivery",
      }),
    });

    console.log("==========================================");
    console.log("RESULT:", result);
    console.log("==========================================");
  } catch (err) {
    console.error("Caught error:", err);
  }
}

testRefundEmail();
