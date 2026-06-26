import dotenv from "dotenv";
import path from "path";
import { sendEmail } from "../src/lib/email";
import React from "react";
import OrderConfirmationEmail from "../src/emails/OrderConfirmationEmail";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testFilter() {
  console.log("Testing email filter to block wpengine.local...");
  
  try {
    const result = await sendEmail({
      to: "don-email@wpengine.local",
      subject: "Test Blocked Email",
      react: React.createElement(OrderConfirmationEmail, {
        customerName: "Test Filter",
        orderNumber: "TEST-12345",
        orderDate: "05 June 2026",
        items: [],
        subtotal: "£0.00",
        vat: "£0.00",
        shipping: "£0.00",
        total: "£0.00",
        shippingAddress: {
          name: "Test Filter",
          line1: "Test Address",
          city: "London",
          postcode: "EC1A 1BB",
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

testFilter();
