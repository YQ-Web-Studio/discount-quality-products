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
 * 1. Pre-persistence REST filter: Rejects any REST API attempt to mutate a paid order
 * (processing or completed) to cancelled or failed before saving to the database.
 */
add_filter('woocommerce_rest_pre_insert_shop_order_object', function($order, $request, $creating) {
    if ($creating) {
        return $order;
    }

    $new_status = $request->get_param('status');
    if (!$new_status) {
        return $order;
    }

    $existing_order = wc_get_order($order->get_id());
    if (!$existing_order) {
        return $order;
    }

    $current_status = $existing_order->get_status();
    $protected_statuses = ['processing', 'completed'];
    $destructive_statuses = ['cancelled', 'failed'];

    if (in_array($current_status, $protected_statuses, true) && in_array($new_status, $destructive_statuses, true)) {
        $error_message = sprintf(
            'Illegal Order Lifecycle Transition: Order #%d is already in "%s" status and cannot be transitioned to "%s" via REST API.',
            $order->get_id(),
            $current_status,
            $new_status
        );

        error_log('[dqp-state-guard] ' . $error_message);

        return new WP_Error(
            'rest_forbidden_status_transition',
            $error_message,
            ['status' => 403]
        );
    }

    return $order;
}, 10, 3);

/**
 * 2. Secondary domain guard: Intercepts status changes across all execution paths
 * if initiated via a REST request.
 */
add_action('woocommerce_order_status_changed', function($order_id, $old_status, $new_status, $order) {
    $protected_statuses = ['processing', 'completed'];
    $destructive_statuses = ['cancelled', 'failed'];

    if (in_array($old_status, $protected_statuses, true) && in_array($new_status, $destructive_statuses, true)) {
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

