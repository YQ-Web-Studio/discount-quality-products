# Discount Quality Products — E-Commerce Storefront

A production-grade, highly-optimized headless e-commerce storefront built with Next.js and integrated with WooCommerce. The storefront is designed to serve a large catalog of over 25,000 products with near-instant load times, featuring secure checkout integrations and real-time inventory updates.

Live Storefront: [www.discountproducts.co.uk](https://www.discountproducts.co.uk)

---

## Architecture Overview

This storefront operates as a decoupled frontend client interacting with a WordPress/WooCommerce backend through APIs:

1. **Headless Catalog**: Fetches product listings, categories, attributes, and inventory dynamically via the WooCommerce REST API.
2. **High-Performance Rendering**: Utilizes Incremental Static Regeneration (ISR) and cache-tag invalidation. Pages are rendered statically for speed and SEO, with cache updates triggered instantly when product data changes.
3. **Secure Transactions**: Features server-side Stripe and PayPal payment gateway integrations, processing orders and customer information securely.
4. **Order Synchronisation**: Receives real-time payment notifications via webhooks, completing checkouts and updating store inventory automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling | TailwindCSS, CSS Variables |
| Payment Gateways | Stripe API, PayPal Checkout SDK |
| Backend CMS | Headless WordPress / WooCommerce REST API |
| Deployment | Vercel (Frontend), Apache/Linux (Backend) |

---

## Key Features

- **Dynamic Navigation**: Categorized catalog browsing with automatic filtering options derived from WooCommerce attributes.
- **Dynamic Search**: High-speed keyword search with debounced inputs and pagination.
- **Unified Shopping Cart**: Secure, persistent client-side shopping cart with real-time stock availability verification.
- **Stripe & PayPal Checkout**: Direct gateway checkout processing with client/server validation.
- **Technical SEO**: Optimized page load times, structural HTML5 elements, automated XML sitemap generation, and dynamic metadata/JSON-LD structured data.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A running WordPress site with WooCommerce activated

### 2. Environment Setup
Create a `.env.local` file in the project root:

```ini
# Store API Configuration
WORDPRESS_URL=https://your-wordpress-backend.com
WOOCOMMERCE_CONSUMER_KEY=ck_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
WOOCOMMERCE_CONSUMER_SECRET=cs_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Payment Gateways
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Store URLs
NEXT_PUBLIC_SITE_URL=https://www.discountproducts.co.uk
```

### 3. Installation
```bash
npm install
```

### 4. Running the Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
npm run start
```

---

## License

This project is private and all rights are reserved. Not licensed for public redistribution or commercial use.
