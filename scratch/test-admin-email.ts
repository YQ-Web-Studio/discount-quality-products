import dotenv from "dotenv";
import path from "path";
import { sendEmail } from "../src/lib/email";
import React from "react";
import OrderConfirmationEmail from "../src/emails/OrderConfirmationEmail";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testEmail() {
  console.log("Testing email sending to sales@fncomputers.com via Resend...");
  console.log("API KEY:", process.env.RESEND_API_KEY ? "Present" : "Missing");

  try {
    const result = await sendEmail({
      to: "sales@fncomputers.com",
      subject: "[Test Admin Notification] New Order Confirmation - TEST-12345",
      react: React.createElement(OrderConfirmationEmail, {
        customerName: "Test Admin",
        orderNumber: "TEST-12345",
        orderDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: [
          {
            id: "1",
            title: "Test Adapter Product",
            quantity: 1,
            price: "£15.00",
            thumbnail: "",
          }
        ],
        subtotal: "£15.00",
        vat: "£3.00",
        shipping: "£0.00",
        total: "£18.00",
        shippingAddress: {
          name: "Test Admin",
          line1: "Office 1",
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

testEmail();
