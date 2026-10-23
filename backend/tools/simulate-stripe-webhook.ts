import * as crypto from 'crypto';

export interface WebhookSimulatorParams {
  event: string;
  orderId?: string | number;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  secret: string;
  timestamp?: number;
}

export interface SimulatorCliOptions {
  event: string;
  orderId: string;
  paymentIntentId: string;
  amount: number;
  secret: string;
  url: string;
}

export function computeStripeSignature(
  payload: string,
  secret: string,
  customTimestamp?: number
): {
  timestamp: number;
  signature: string;
  header: string;
} {
  const timestamp = customTimestamp !== undefined ? customTimestamp : Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return {
    timestamp,
    signature,
    header: `t=${timestamp},v1=${signature}`,
  };
}

export function buildSignedWebhookPayload(params: WebhookSimulatorParams): {
  payload: string;
  signatureHeader: string;
  eventObject: any;
} {
  const eventId = `evt_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const piId = params.paymentIntentId || `pi_simulated_${Date.now()}`;
  const amount = params.amount !== undefined ? params.amount : 8902;
  const currency = params.currency || 'gbp';
  const orderId = params.orderId !== undefined ? String(params.orderId) : '1001';

  let dataObject: Record<string, any>;

  if (params.event === 'payment_intent.payment_failed') {
    dataObject = {
      id: piId,
      object: 'payment_intent',
      amount,
      amount_received: 0,
      currency,
      status: 'requires_payment_method',
      metadata: {
        orderId,
      },
      last_payment_error: {
        code: 'card_declined',
        message: 'Your card has expired or was declined by the issuer.',
      },
    };
  } else {
    // Default payment_intent.succeeded
    dataObject = {
      id: piId,
      object: 'payment_intent',
      amount,
      amount_received: amount,
      currency,
      status: 'succeeded',
      metadata: {
        orderId,
      },
      latest_charge: `ch_sim_${Date.now()}`,
    };
  }

  const eventObject = {
    id: eventId,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: dataObject,
    },
    type: params.event,
  };

  const payload = JSON.stringify(eventObject, null, 2);
  const { header } = computeStripeSignature(payload, params.secret, params.timestamp);

  return {
    payload,
    signatureHeader: header,
    eventObject,
  };
}

export function parseSimulatorArgs(argv: string[]): SimulatorCliOptions {
  const getArg = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const found = argv.find((a) => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : undefined;
  };

  const event = getArg('event') || 'payment_intent.succeeded';
  const orderId = getArg('orderId') || '1001';
  const paymentIntentId = getArg('pi') || `pi_simulated_${Date.now()}`;
  const amountStr = getArg('amount');
  const amount = amountStr ? parseInt(amountStr, 10) : 8902;
  const secret = getArg('secret') || process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
  const url = getArg('url') || 'http://localhost:3000/api/webhooks/stripe';

  return {
    event,
    orderId,
    paymentIntentId,
    amount,
    secret,
    url,
  };
}

export async function sendWebhook(
  url: string,
  payload: string,
  signatureHeader: string
): Promise<{ status: number; body: string; durationMs: number }> {
  const startTime = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signatureHeader,
    },
    body: payload,
  });

  const durationMs = Date.now() - startTime;
  const body = await res.text();
  return {
    status: res.status,
    body,
    durationMs,
  };
}

export async function runSimulator(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const options = parseSimulatorArgs(rawArgs);

  console.log('--- Stripe Webhook Simulator ---');
  console.log(`Target URL:  ${options.url}`);
  console.log(`Event Type:  ${options.event}`);
  console.log(`Order ID:    ${options.orderId}`);
  console.log(`Amount:      £${(options.amount / 100).toFixed(2)} (${options.amount} pence)`);
  console.log(`PI ID:       ${options.paymentIntentId}`);
  console.log(`Secret:      ${options.secret.substring(0, 10)}...`);

  const signed = buildSignedWebhookPayload(options);

  console.log('\n[simulator] Dispatching signed webhook request...');
  try {
    const result = await sendWebhook(options.url, signed.payload, signed.signatureHeader);
    console.log(`[simulator] Response: HTTP ${result.status} in ${result.durationMs}ms`);
    console.log(`[simulator] Body: ${result.body}`);
    if (result.status >= 200 && result.status < 300) {
      console.log('✓ [simulator] Webhook delivered and accepted successfully!');
    } else {
      console.warn('⚠ [simulator] Webhook returned non-2xx response status.');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[simulator] Request could not reach target endpoint (${message}).`);
    console.log('[simulator] Note: Ensure Next.js app is running via `npm run dev` to receive live webhooks.');
  }
}

if (require.main === module || process.argv[1]?.includes('simulate-stripe-webhook')) {
  runSimulator().catch((err) => {
    console.error('[simulator] Fatal error:', err);
    process.exit(1);
  });
}
