<?php
/**
 * Snippet Name: Order Lifecycle State Machine & Immutable Paid Order Guard
 * Description: Hard blocks any REST API attempt to downgrade, cancel, or fail orders that are in processing or completed status.
 * Scope: global
 * Ticket: DQP-16
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enforce zero-trust state machine invariant at the WooCommerce domain layer.
 * Any automated API call attempting to transition a paid order (processing/completed)
 * to cancelled or failed will be rejected with HTTP 403 Forbidden.
 */
add_action('woocommerce_order_status_changed', function($order_id, $old_status, $new_status, $order) {
    $protected_statuses = ['processing', 'completed'];
    $destructive_statuses = ['cancelled', 'failed'];

    if (in_array($old_status, $protected_statuses, true) && in_array($new_status, $destructive_statuses, true)) {
        // Enforce restriction strictly for automated REST API requests
        if (defined('REST_REQUEST') && REST_REQUEST) {
            $error_message = sprintf(
                'Illegal Order Lifecycle Transition: Order #%d is already in "%s" status and cannot be transitioned to "%s" via REST API.',
                $order_id,
                $old_status,
                $new_status
            );

            error_log('[dqp-state-guard] ' . $error_message);

            if (class_exists('WC_REST_Exception')) {
                throw new WC_REST_Exception(
                    'rest_forbidden_status_transition',
                    $error_message,
                    403
                );
            } else {
                wp_die(esc_html($error_message), 'Forbidden Order Status Transition', ['response' => 403]);
            }
        }
    }
}, 10, 4);
