import dotenv from "dotenv";
import path from "path";
import { sendEmail } from "../src/lib/email";
import React from "react";
import OrderConfirmationEmail from "../src/emails/OrderConfirmationEmail";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testEmail() {
  console.log("Testing email sending via Resend...");
  console.log("API KEY:", process.env.RESEND_API_KEY ? "Present (ends with " + process.env.RESEND_API_KEY.slice(-5) + ")" : "Missing");

  try {
    const result = await sendEmail({
      to: "yusufq2004@gmail.com",
      subject: "Headless Resend Test Email",
      react: React.createElement(OrderConfirmationEmail, {
        customerName: "Yusuf",
        orderNumber: "TEST-12345",
        orderDate: "05 June 2026",
        items: [
          {
            id: "1",
            title: "Test Product",
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

testEmail();
