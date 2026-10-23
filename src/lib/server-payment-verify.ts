import Stripe from 'stripe';

export interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  county?: string;
  postcode: string;
  country?: string;
  phone?: string;
  showBillingAddress?: boolean;
  billingFirstName?: string;
  billingLastName?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingCounty?: string;
  billingPostcode?: string;
  billingCountry?: string;
  billingPhone?: string;
}

export interface ItemPayload {
  id: number | string;
  quantity: number;
}

export function validatePayPalCaptureDetails(
  captureDetails: { status?: string; amount?: { currency_code?: string; value?: string } },
  expectedAmount: number
): { isValid: boolean; error?: string } {
  if (captureDetails.status !== 'COMPLETED') {
    return {
      isValid: false,
      error: `Capture status is ${captureDetails.status || 'unknown'}, expected COMPLETED.`,
    };
  }

  const currency = captureDetails.amount?.currency_code;
  if (currency !== 'GBP') {
    return {
      isValid: false,
      error: `Currency mismatch: captured ${currency || 'none'}, expected GBP.`,
    };
  }

  const capturedVal = parseFloat(captureDetails.amount?.value || '0');
  if (Math.abs(capturedVal - expectedAmount) > 0.01) {
    return {
      isValid: false,
      error: `Amount mismatch: captured £${capturedVal.toFixed(2)}, expected £${expectedAmount.toFixed(2)}.`,
    };
  }

  return { isValid: true };
}

export function buildPendingOrderPayload(params: {
  items: ItemPayload[];
  form: CustomerForm;
  shippingCost: number;
  shippingTitle: string;
  paymentProvider: 'paypal' | 'stripe';
  couponCode?: string;
  customerId?: number;
}): Record<string, any> {
  const isBillingDifferent = params.form.showBillingAddress === true;

  const delivery = {
    first_name: params.form.firstName,
    last_name: params.form.lastName,
    address_1: params.form.address1,
    address_2: params.form.address2 || '',
    city: params.form.city,
    state: params.form.county || '',
    postcode: params.form.postcode,
    country: params.form.country || 'GB',
    email: params.form.email,
    phone: params.form.phone || '',
  };

  const billing = {
    first_name: isBillingDifferent ? params.form.billingFirstName || params.form.firstName : params.form.firstName,
    last_name: isBillingDifferent ? params.form.billingLastName || params.form.lastName : params.form.lastName,
    address_1: isBillingDifferent ? params.form.billingAddress1 || params.form.address1 : params.form.address1,
    address_2: isBillingDifferent ? params.form.billingAddress2 || '' : params.form.address2 || '',
    city: isBillingDifferent ? params.form.billingCity || params.form.city : params.form.city,
    state: isBillingDifferent ? params.form.billingCounty || params.form.county || '' : params.form.county || '',
    postcode: isBillingDifferent ? params.form.billingPostcode || params.form.postcode : params.form.postcode,
    country: isBillingDifferent ? params.form.billingCountry || 'GB' : params.form.country || 'GB',
    email: params.form.email,
    phone: isBillingDifferent ? params.form.billingPhone || params.form.phone || '' : params.form.phone || '',
  };

  const line_items = params.items.map((item) => {
    const rawId = item.id;
    let numericId = typeof rawId === 'number' ? rawId : parseInt(rawId, 10);
    if (isNaN(numericId) && typeof rawId === 'string') {
      try {
        const decoded = Buffer.from(rawId, 'base64').toString('utf8');
        const match = decoded.match(/:(\d+)$/);
        if (match) numericId = parseInt(match[1], 10);
      } catch {}
    }
    return {
      product_id: numericId,
      quantity: item.quantity,
    };
  });

  const isFirstClass = params.shippingTitle.toLowerCase().includes('first class') || params.shippingTitle.toLowerCase().includes('1st class');

  const meta_data: Array<{ key: string; value: string }> = [
    { key: '_order_lifecycle', value: 'pending_first' },
  ];

  if (params.couponCode) {
    meta_data.push({ key: '_applied_coupon_code', value: params.couponCode.trim().toLowerCase() });
  }

  const orderData: Record<string, any> = {
    payment_method: params.paymentProvider === 'paypal' ? 'ppcp-gateway' : 'stripe',
    payment_method_title: params.paymentProvider === 'paypal' ? 'PayPal' : 'Credit Card (Stripe)',
    set_paid: false,
    status: 'pending',
    currency: 'GBP',
    customer_id: params.customerId || 0,
    customer_note: `Pending payment via ${params.paymentProvider === 'paypal' ? 'PayPal' : 'Stripe'}.`,
    billing,
    shipping: delivery,
    line_items,
    shipping_lines: [
      {
        method_id: isFirstClass ? 'flat_rate' : 'free_shipping',
        method_title: params.shippingTitle,
        total: params.shippingCost.toFixed(2),
      },
    ],
    meta_data,
  };

  if (params.couponCode) {
    orderData.coupon_lines = [{ code: params.couponCode.trim().toLowerCase() }];
  }

  return orderData;
}

export async function verifyPaymentServerSide(params: {
  provider: string;
  transactionId: string;
  expectedAmount: number;
}): Promise<{ verified: boolean; error?: string; captureDetails?: any }> {
  if (!params.transactionId || params.transactionId.startsWith('FAKE') || params.transactionId.length < 5) {
    return {
      verified: false,
      error: `Invalid or fabricated transaction reference: "${params.transactionId}".`,
    };
  }

  if (params.provider === 'stripe') {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return { verified: false, error: 'Stripe secret key not configured.' };
    }
    try {
      const stripe = new Stripe(secret, { apiVersion: '2023-10-16' as any });
      const isPi = params.transactionId.startsWith('pi_');
      if (isPi) {
        const pi = await stripe.paymentIntents.retrieve(params.transactionId);
        if (pi.status !== 'succeeded') {
          return { verified: false, error: `PaymentIntent status is ${pi.status}, expected succeeded.` };
        }
        const expectedPence = Math.round(params.expectedAmount * 100);
        if (pi.amount !== expectedPence) {
          return { verified: false, error: `Amount mismatch: PaymentIntent has £${(pi.amount / 100).toFixed(2)}, expected £${params.expectedAmount.toFixed(2)}.` };
        }
        return { verified: true, captureDetails: pi };
      } else {
        const charge = await stripe.charges.retrieve(params.transactionId);
        if (charge.status !== 'succeeded') {
          return { verified: false, error: `Charge status is ${charge.status}, expected succeeded.` };
        }
        return { verified: true, captureDetails: charge };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { verified: false, error: `Stripe verification failed: ${message}` };
    }
  }

  if (params.provider === 'paypal') {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { verified: false, error: 'PayPal credentials not configured.' };
    }
    const baseUrl = process.env.PAYPAL_API_URL || (process.env.NODE_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!tokenRes.ok) {
        return { verified: false, error: 'Failed to authenticate with PayPal.' };
      }
      const tokenData = await tokenRes.json();

      // Check capture
      const capRes = await fetch(`${baseUrl}/v2/payments/captures/${params.transactionId}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!capRes.ok) {
        return { verified: false, error: `PayPal capture ${params.transactionId} could not be verified.` };
      }
      const capData = await capRes.json();
      const validation = validatePayPalCaptureDetails(capData, params.expectedAmount);
      if (!validation.isValid) {
        return { verified: false, error: validation.error };
      }
      return { verified: true, captureDetails: capData };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { verified: false, error: `PayPal verification failed: ${message}` };
    }
  }

  return { verified: false, error: `Unsupported payment provider: ${params.provider}` };
}
