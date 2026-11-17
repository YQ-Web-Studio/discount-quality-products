import { fetchWooCommerceOrder, updateWooCommerceOrder } from '@/lib/woocommerce';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

/**
 * Enterprise State Transition Matrix
 *
 * Defines the strict, one-way forward transitions permitted in the e-commerce lifecycle.
 * In particular:
 * - Paid orders ('processing', 'completed') can NEVER be cancelled or marked failed.
 * - Terminal states ('cancelled', 'refunded') cannot be arbitrarily mutated.
 * - 'pending' can transition forward to 'processing' upon payment capture.
 */
export const LEGAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['processing', 'on-hold', 'cancelled', 'failed'],
  processing: ['completed', 'refunded'], // CANCELLED and FAILED are strictly forbidden for paid orders
  'on-hold': ['processing', 'cancelled', 'failed'],
  completed: ['refunded'], // Fulfilled orders can only be refunded
  cancelled: [], // Terminal
  refunded: [],  // Terminal
  failed: ['pending'], // Failed payments can be retried into pending
};

export class IllegalOrderStateTransitionError extends Error {
  public readonly orderId: number;
  public readonly currentStatus: string;
  public readonly targetStatus: string;

  constructor(orderId: number, currentStatus: string, targetStatus: string, reason?: string) {
    const detail = reason ? ` (${reason})` : '';
    super(
      `Illegal Order Lifecycle Transition: Cannot transition Order #${orderId} from '${currentStatus}' to '${targetStatus}'${detail}. Paid/processing orders are immutable regarding cancellation.`
    );
    this.name = 'IllegalOrderStateTransitionError';
    this.orderId = orderId;
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

/**
 * Validates whether a proposed order status transition is permitted by the lifecycle matrix.
 */
export function isAllowedStatusTransition(
  currentStatus: OrderStatus | string,
  targetStatus: OrderStatus | string
): boolean {
  const allowed = LEGAL_TRANSITIONS[currentStatus as OrderStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(targetStatus as OrderStatus);
}

export interface OrderTransitionOptions {
  customerNote?: string;
  transactionId?: string;
  setPaid?: boolean;
  metaData?: Array<{ key: string; value: string }>;
  reason?: string;
}

/**
 * Centralized, guarded order lifecycle transition manager.
 * Verifies live order status and enforces state machine invariants
 * before dispatching updates to WooCommerce.
 */
export async function transitionOrderStatus(
  orderId: number,
  targetStatus: OrderStatus,
  options: OrderTransitionOptions = {}
): Promise<any> {
  const existingOrder = await fetchWooCommerceOrder(orderId);
  if (!existingOrder) {
    throw new Error(`Order #${orderId} not found in WooCommerce.`);
  }

  const currentStatus = (existingOrder.status || 'pending').toLowerCase() as OrderStatus;

  if (currentStatus === targetStatus) {
    console.log(`[order-lifecycle] Order #${orderId} is already in '${targetStatus}' status — skipping redundant transition.`);
    return existingOrder;
  }

  if (!isAllowedStatusTransition(currentStatus, targetStatus)) {
    throw new IllegalOrderStateTransitionError(
      orderId,
      currentStatus,
      targetStatus,
      options.reason
    );
  }

  const updatePayload: Record<string, any> = {
    status: targetStatus,
  };

  if (options.setPaid !== undefined) {
    updatePayload.set_paid = options.setPaid;
  }

  if (options.transactionId) {
    updatePayload.transaction_id = options.transactionId;
  }

  if (options.customerNote) {
    updatePayload.customer_note = options.customerNote;
  }

  if (options.metaData && options.metaData.length > 0) {
    updatePayload.meta_data = options.metaData;
  }

  console.log(`[order-lifecycle] Transitioning Order #${orderId} from '${currentStatus}' -> '${targetStatus}'...`);
  return await updateWooCommerceOrder(orderId, updatePayload);
}
