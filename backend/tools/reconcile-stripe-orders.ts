import * as fs from 'fs';
import * as path from 'path';
import Stripe from 'stripe';
import { createWooCommerceOrder, searchWooCommerceOrderByPaymentIntent, fetchWooCommerceOrders } from '../../src/lib/woocommerce';

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  phone?: string;
}

export interface CartItem {
  id: number;
  quantity: number;
}

export interface ParsedMetadata {
  items: CartItem[];
  customer: CustomerDetails;
  couponCode?: string;
  discountAmount?: number;
}

export interface ReconcileCliOptions {
  sinceTimestamp: number;
  execute: boolean;
  targetPi?: string;
  includePreSep26?: boolean;
}

export function loadEnvironment(): void {
  // 1. Load .env.local if not already loaded
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }

  // 2. Load live stripe key if STRIPE_SECRET_KEY is absent or test key
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    const parentKeyPath = path.resolve(process.cwd(), '..', 'data', 'api stripe.txt');
    const localKeyPath = path.resolve(process.cwd(), 'data', 'api stripe.txt');
    const targetKeyPath = fs.existsSync(parentKeyPath) ? parentKeyPath : fs.existsSync(localKeyPath) ? localKeyPath : null;
    if (targetKeyPath) {
      const content = fs.readFileSync(targetKeyPath, 'utf8');
      const match = content.match(/sk_live_[a-zA-Z0-9]+/);
      if (match) {
        process.env.STRIPE_SECRET_KEY = match[0];
      }
    }
  }
}

export function parsePaymentIntentMetadata(metadata: Record<string, string> = {}): ParsedMetadata {
  let items: CartItem[] = [];

  // Check both snake_case (cart_items) and camelCase (cartItems)
  const cartItemsRaw = metadata.cart_items || metadata.cartItems;
  if (cartItemsRaw) {
    try {
      const parsedItems = JSON.parse(cartItemsRaw);
      if (Array.isArray(parsedItems)) {
        items = parsedItems.map((item: any) => ({
          id: item.i ?? item.id,
          quantity: item.q ?? item.quantity ?? 1,
        }));
      }
    } catch {
      // Fallback
    }
  }

  if (items.length === 0 && metadata.databaseIds) {
    const ids = metadata.databaseIds.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
    items = ids.map((id) => ({ id, quantity: 1 }));
  }

  let customer: CustomerDetails = {
    firstName: '',
    lastName: '',
    email: '',
  };

  // Try parsing delivery_address or billing_address first
  let deliveryObj: any = null;
  const deliveryRaw = metadata.delivery_address || metadata.deliveryAddress;
  if (deliveryRaw) {
    try {
      deliveryObj = JSON.parse(deliveryRaw);
    } catch {
      // Fallback
    }
  }

  let billingObj: any = null;
  const billingRaw = metadata.billing_address || metadata.billingAddress;
  if (billingRaw) {
    try {
      billingObj = JSON.parse(billingRaw);
    } catch {
      // Fallback
    }
  }

  let formObj: any = null;
  const formRaw = metadata.cart_form || metadata.cartForm;
  if (formRaw) {
    try {
      formObj = JSON.parse(formRaw);
    } catch {
      // Fallback
    }
  }

  customer = {
    firstName: deliveryObj?.firstName || formObj?.fn || formObj?.firstName || billingObj?.firstName || '',
    lastName: deliveryObj?.lastName || formObj?.ln || formObj?.lastName || billingObj?.lastName || '',
    email: billingObj?.email || formObj?.em || formObj?.email || deliveryObj?.email || '',
    address1: deliveryObj?.address1 || formObj?.a1 || formObj?.address1 || billingObj?.address1 || '',
    address2: deliveryObj?.address2 || formObj?.a2 || formObj?.address2 || billingObj?.address2 || '',
    city: deliveryObj?.city || formObj?.ct || formObj?.city || billingObj?.city || '',
    county: deliveryObj?.county || formObj?.co || formObj?.county || formObj?.state || billingObj?.county || '',
    postcode: deliveryObj?.postcode || formObj?.pc || formObj?.postcode || billingObj?.postcode || '',
    country: deliveryObj?.country || formObj?.country || billingObj?.country || 'GB',
    phone: deliveryObj?.phone || formObj?.ph || formObj?.phone || billingObj?.phone || '',
  };

  const couponCode = metadata.cart_coupon || metadata.couponCode;
  const discountRaw = metadata.cart_discount || metadata.discountAmount;
  let discountAmount: number | undefined = undefined;
  if (discountRaw) {
    const parsedDiscount = parseFloat(discountRaw);
    if (!isNaN(parsedDiscount) && parsedDiscount > 0) {
      discountAmount = parsedDiscount;
    }
  }

  return {
    items,
    customer,
    couponCode,
    discountAmount,
  };
}

export function buildRecoveryOrderPayload(params: {
  chargeId: string;
  paymentIntentId: string;
  amountPence: number;
  customer: CustomerDetails;
  items: CartItem[];
  couponCode?: string;
  discountAmount?: number;
}): Record<string, any> {
  const delivery = {
    first_name: params.customer.firstName,
    last_name: params.customer.lastName,
    address_1: params.customer.address1 || '',
    address_2: params.customer.address2 || '',
    city: params.customer.city || '',
    state: params.customer.county || '',
    postcode: params.customer.postcode || '',
    country: params.customer.country || 'GB',
    email: params.customer.email,
    phone: params.customer.phone || '',
  };

  const line_items = params.items.map((item) => ({
    product_id: item.id,
    quantity: item.quantity,
  }));

  const meta_data = [
    { key: '_stripe_charge_id', value: params.chargeId },
    { key: '_stripe_payment_intent_id', value: params.paymentIntentId },
    { key: '_stripe_intent_id', value: params.paymentIntentId },
    { key: '_stripe_source_id', value: params.chargeId },
    { key: '_stripe_charge_captured', value: 'yes' },
    { key: '_recovered_by_reconciliation', value: 'yes' },
    { key: '_recovery_timestamp', value: new Date().toISOString() },
  ];

  if (params.couponCode) {
    meta_data.push({ key: '_recovered_coupon_code', value: params.couponCode });
  }

  const payload: Record<string, any> = {
    payment_method: 'stripe',
    payment_method_title: 'Credit Card (Stripe)',
    set_paid: true,
    status: 'processing',
    transaction_id: params.chargeId,
    currency: 'GBP',
    customer_note: `Recovered via Stripe reconciliation engine for charge ${params.chargeId} (PI: ${params.paymentIntentId}).${
      params.couponCode ? ` Voucher applied: ${params.couponCode}.` : ''
    }`,
    billing: delivery,
    shipping: delivery,
    line_items,
    meta_data,
  };

  // Safe discount application without coupon_lines to avoid rest_cannot_apply_coupon error
  if (
    typeof params.discountAmount === 'number' &&
    Number.isFinite(params.discountAmount) &&
    params.discountAmount > 0
  ) {
    const discountExVat = (params.discountAmount / 1.2).toFixed(2);
    payload.fee_lines = [
      {
        name: params.couponCode ? `Voucher Discount (${params.couponCode})` : 'Promotion Discount',
        total: `-${discountExVat}`,
        tax_status: 'taxable',
      },
    ];
  }

  return payload;
}

export function matchChargeWithOrders(
  chargeId: string,
  paymentIntentId: string,
  existingOrders: Array<{
    id: number;
    status?: string;
    transaction_id?: string;
    total?: string;
    billing?: { email?: string };
    meta_data?: Array<{ key: string; value: string }>;
  }>,
  chargeAmountPence?: number,
  customerEmail?: string,
  claimedOrderIds?: Set<number>
): number | null {
  for (const order of existingOrders) {
    // 0. Skip already claimed orders in this run to avoid duplicate assignments
    if (claimedOrderIds?.has(order.id)) {
      continue;
    }

    // Skip cancelled, failed, or refunded orders
    const normalizedStatus = order.status?.toLowerCase().trim();
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed' || normalizedStatus === 'refunded') {
      continue;
    }

    // 1. Check direct transaction_id match
    if (order.transaction_id && (order.transaction_id === chargeId || order.transaction_id === paymentIntentId)) {
      claimedOrderIds?.add(order.id);
      return order.id;
    }

    // 2. Check direct meta_data match
    if (order.meta_data && Array.isArray(order.meta_data)) {
      const matchMeta = order.meta_data.some(
        (m) =>
          (m.key === '_stripe_payment_intent_id' && m.value === paymentIntentId) ||
          (m.key === '_stripe_intent_id' && m.value === paymentIntentId) ||
          (m.key === '_stripe_charge_id' && m.value === chargeId) ||
          (m.key === '_stripe_source_id' && m.value === chargeId)
      );
      if (matchMeta) {
        claimedOrderIds?.add(order.id);
        return order.id;
      }
    }

    // 3. Fallback: Check customer email and exact amount
    // Ensure order does NOT belong to a different Stripe payment
    const hasConflictingStripeId =
      (order.transaction_id &&
        (order.transaction_id.startsWith('ch_') || order.transaction_id.startsWith('pi_')) &&
        order.transaction_id !== chargeId &&
        order.transaction_id !== paymentIntentId) ||
      (order.meta_data &&
        Array.isArray(order.meta_data) &&
        order.meta_data.some(
          (m) =>
            ((m.key === '_stripe_charge_id' || m.key === '_stripe_source_id') && m.value && m.value !== chargeId) ||
            ((m.key === '_stripe_payment_intent_id' || m.key === '_stripe_intent_id') && m.value && m.value !== paymentIntentId)
        ));

    if (!hasConflictingStripeId && typeof chargeAmountPence === 'number' && customerEmail && order.billing?.email) {
      const emailMatch = order.billing.email.toLowerCase().trim() === customerEmail.toLowerCase().trim();
      const amountDiff = Math.abs(parseFloat(order.total || '0') - chargeAmountPence / 100);
      if (emailMatch && amountDiff < 0.05) {
        claimedOrderIds?.add(order.id);
        return order.id;
      }
    }
  }

  return null;
}

export function parseReconcileCliArgs(argv: string[]): ReconcileCliOptions {
  const getArg = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const found = argv.find((a) => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : undefined;
  };

  const sinceStr = getArg('since');
  const includePreSep26 = argv.includes('--all') || argv.includes('--include-pre-sep26');

  // Default to 2026-09-26 00:00:00 UTC
  let sinceTimestamp = Math.floor(new Date('2026-09-26T00:00:00Z').getTime() / 1000);

  if (includePreSep26) {
    // Scan since 2026-09-01
    sinceTimestamp = Math.floor(new Date('2026-09-01T00:00:00Z').getTime() / 1000);
  }

  // Explicit --since takes precedence over both default and --include-pre-sep26 / --all
  if (sinceStr) {
    const parsedDate = new Date(sinceStr).getTime();
    if (!isNaN(parsedDate)) {
      sinceTimestamp = Math.floor(parsedDate / 1000);
    }
  }

  const execute = argv.includes('--execute');
  const targetPi = getArg('pi');

  return {
    sinceTimestamp,
    execute,
    targetPi,
    includePreSep26,
  };
}

export async function runReconciliation(): Promise<void> {
  loadEnvironment();

  const options = parseReconcileCliArgs(process.argv.slice(2));

  console.log('=== Stripe Order Reconciliation Engine ===');
  console.log(`Scanning charges created after: ${new Date(options.sinceTimestamp * 1000).toISOString()}`);
  console.log(`Execution Mode:                 ${options.execute ? 'LIVE EXECUTION (--execute)' : 'DRY RUN (safe audit)'}`);
  if (options.targetPi) {
    console.log(`Targeting Single PaymentIntent: ${options.targetPi}`);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.warn('[reconcile] Warning: STRIPE_SECRET_KEY is not configured in environment.');
    console.log('[reconcile] Reconciliation requires a valid Stripe key.');
    return;
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
    maxNetworkRetries: 3,
  });

  // Pre-load recent WooCommerce orders for high-speed, rate-limit-friendly deduplication
  console.log('[reconcile] Pre-loading existing WooCommerce orders for deduplication...');
  const existingOrders: any[] = [];
  try {
    let page = 1;
    while (page <= 5) {
      const batch = await fetchWooCommerceOrders({ per_page: 50, page });
      if (!batch || batch.length === 0) break;
      existingOrders.push(...batch);
      page++;
    }
    console.log(`[reconcile] Indexed ${existingOrders.length} existing WooCommerce orders.`);
  } catch (err) {
    console.warn('[reconcile] Could not pre-fetch batch of WooCommerce orders; falling back to per-order search.', err);
  }

  console.log('[reconcile] Fetching Stripe charges...');
  const allCharges: Stripe.Charge[] = [];
  let startingAfter: string | undefined = undefined;

  while (true) {
    const res = await stripe.charges.list({
      created: { gte: options.sinceTimestamp },
      limit: 100,
      starting_after: startingAfter,
    });
    allCharges.push(...res.data);
    if (!res.has_more) break;
    startingAfter = res.data[res.data.length - 1].id;
  }

  console.log(`[reconcile] Retrieved ${allCharges.length} charges from Stripe.`);

  let orphanCount = 0;
  let verifiedCount = 0;
  const recoveredOrders: Array<{ orderId: number; chargeId: string; piId: string; customer: string; amount: string }> = [];

  const claimedOrderIds = new Set<number>();

  for (const charge of allCharges) {
    if (charge.status !== 'succeeded') continue;

    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!piId) continue;

    if (options.targetPi && piId !== options.targetPi) {
      continue;
    }

    const customerEmail = charge.billing_details?.email || charge.receipt_email || '';
    let lookupFailed = false;

    // 1. Check in-memory index
    let matchedOrderId = matchChargeWithOrders(charge.id, piId, existingOrders, charge.amount, customerEmail, claimedOrderIds);

    // 2. If no in-memory match, check live WooCommerce search by PI
    if (!matchedOrderId) {
      try {
        const orderFromPi = await searchWooCommerceOrderByPaymentIntent(piId);
        if (orderFromPi && !claimedOrderIds.has(orderFromPi.id)) {
          matchedOrderId = orderFromPi.id;
          claimedOrderIds.add(orderFromPi.id);
        }
      } catch (err) {
        console.warn(`[reconcile] Error looking up PI ${piId} in WooCommerce:`, err);
        lookupFailed = true;
      }
    }

    // 3. If still no match and lookups haven't failed, check live WooCommerce search by Charge ID
    if (!matchedOrderId && !lookupFailed) {
      try {
        const orderFromCharge = await searchWooCommerceOrderByPaymentIntent(charge.id);
        if (orderFromCharge && !claimedOrderIds.has(orderFromCharge.id)) {
          matchedOrderId = orderFromCharge.id;
          claimedOrderIds.add(orderFromCharge.id);
        }
      } catch (err) {
        console.warn(`[reconcile] Error looking up Charge ${charge.id} in WooCommerce:`, err);
        lookupFailed = true;
      }
    }

    if (matchedOrderId) {
      verifiedCount++;
      console.log(`✓ [Verified] PI ${piId} (Charge: ${charge.id}) -> Order #${matchedOrderId} (£${(charge.amount / 100).toFixed(2)})`);
    } else if (lookupFailed) {
      console.warn(`⚠ [SKIPPED] Lookup failed due to WooCommerce error for Charge ${charge.id} (PI: ${piId}); skipping recovery to avoid duplicate order creation.`);
    } else {
      orphanCount++;
      console.warn(`\n⚠ [ORPHAN FOUND] Charge ${charge.id} (PI: ${piId}) has no WooCommerce order!`);
      console.log(`   Customer: ${charge.billing_details?.name} (${customerEmail})`);
      console.log(`   Amount:   £${(charge.amount / 100).toFixed(2)}`);
      console.log(`   Date:     ${new Date(charge.created * 1000).toISOString()}`);

      // Retrieve full PaymentIntent to inspect metadata
      const pi = await stripe.paymentIntents.retrieve(piId);
      const parsed = parsePaymentIntentMetadata(pi.metadata);
      const payload = buildRecoveryOrderPayload({
        chargeId: charge.id,
        paymentIntentId: piId,
        amountPence: charge.amount,
        customer: {
          firstName: parsed.customer.firstName || charge.billing_details?.name?.split(' ')[0] || 'Customer',
          lastName: parsed.customer.lastName || charge.billing_details?.name?.split(' ').slice(1).join(' ') || '',
          email: parsed.customer.email || customerEmail,
          address1: parsed.customer.address1 || charge.billing_details?.address?.line1 || '',
          address2: parsed.customer.address2 || charge.billing_details?.address?.line2 || '',
          city: parsed.customer.city || charge.billing_details?.address?.city || '',
          county: parsed.customer.county || charge.billing_details?.address?.state || '',
          postcode: parsed.customer.postcode || charge.billing_details?.address?.postal_code || '',
          country: parsed.customer.country || charge.billing_details?.address?.country || 'GB',
          phone: parsed.customer.phone || charge.billing_details?.phone || '',
        },
        items: parsed.items,
        couponCode: parsed.couponCode,
        discountAmount: parsed.discountAmount,
      });

      if (options.execute) {
        console.log(`   [reconcile] Creating WooCommerce order for ${piId}...`);
        try {
          const recovered = await createWooCommerceOrder(payload);
          console.log(`   ✓ Successfully recovered order #${recovered.id} for ${customerEmail}!`);
          recoveredOrders.push({
            orderId: recovered.id,
            chargeId: charge.id,
            piId,
            customer: `${payload.billing.first_name} ${payload.billing.last_name}`,
            amount: `£${(charge.amount / 100).toFixed(2)}`,
          });
          // Add to existingOrders to prevent any double creation in the same session
          existingOrders.push(recovered);
        } catch (err) {
          console.error(`   ✗ Error recovering order for ${piId}:`, err);
        }
      } else {
        console.log('   [Dry Run] Prepared Recovery Payload:');
        console.log(`   Items:       ${JSON.stringify(payload.line_items)}`);
        console.log(`   Total (Stripe): £${(charge.amount / 100).toFixed(2)}`);
        if (payload.fee_lines) {
          console.log(`   Fee Lines:   ${JSON.stringify(payload.fee_lines)}`);
        }
        console.log(`   Run with --execute to create this order in WooCommerce.`);
      }
    }
  }

  console.log('\n=== Reconciliation Summary ===');
  console.log(`Total Charges Scanned: ${allCharges.length}`);
  console.log(`Verified Orders:       ${verifiedCount}`);
  console.log(`Orphan Charges:        ${orphanCount}`);

  if (recoveredOrders.length > 0) {
    console.log('\n=== Recovered Orders Created ===');
    console.table(recoveredOrders);
  } else if (orphanCount > 0 && !options.execute) {
    console.log('\nAction Required: Run `npm run reconcile:stripe -- --execute` to provision missing WooCommerce orders.');
  } else if (orphanCount === 0) {
    console.log('\nAll Stripe charges are accounted for. No orphan payments detected.');
  }
}

if (require.main === module || process.argv[1]?.includes('reconcile-stripe-orders')) {
  runReconciliation().catch((err) => {
    console.error('[reconcile] Fatal error:', err);
    process.exit(1);
  });
}
