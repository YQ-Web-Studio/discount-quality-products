<?php
/**
 * Snippet Name: Payment Identifier Order Search & HPOS Compatibility
 * Description: Enables exact order matching by Stripe payment intent/charge ID and PayPal capture/order ID in both legacy postmeta and HPOS custom order tables.
 * Scope: global
 * Ticket: DQP-14
 */

if (!defined('ABSPATH')) {
    exit;
}

// 1. Support legacy order search fields (when HPOS is disabled or syncing)
add_filter('woocommerce_shop_order_search_fields', function($search_fields) {
    $custom_fields = [
        '_transaction_id',
        '_stripe_intent_id',
        '_stripe_charge_id',
        '_paypal_capture_id',
        '_paypal_order_id',
    ];
    return array_unique(array_merge($search_fields, $custom_fields));
});

// 2. Support HPOS (High-Performance Order Storage) order table search
add_filter('woocommerce_order_table_search_query_meta_keys', function($meta_keys) {
    $custom_keys = [
        '_transaction_id',
        '_stripe_intent_id',
        '_stripe_charge_id',
        '_paypal_capture_id',
        '_paypal_order_id',
    ];
    return array_unique(array_merge($meta_keys, $custom_keys));
});

// 3. Register a dedicated, versioned REST endpoint: GET /wp-json/wc/v3/orders/by-payment?identifier=XYZ
add_action('rest_api_init', function() {
    register_rest_route('wc/v3', '/orders/by-payment', [
        'methods' => 'GET',
        'callback' => 'dqp_rest_get_order_by_payment_identifier',
        'permission_callback' => function() {
            return current_user_can('manage_woocommerce');
        },
        'args' => [
            'identifier' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
    ]);

    // Also register under dqp/v1 for compatibility
    register_rest_route('dqp/v1', '/orders/by-payment', [
        'methods' => 'GET',
        'callback' => 'dqp_rest_get_order_by_payment_identifier',
        'permission_callback' => function() {
            return current_user_can('manage_woocommerce');
        },
        'args' => [
            'identifier' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ],
    ]);
});

function dqp_rest_get_order_by_payment_identifier($request) {
    $identifier = trim($request->get_param('identifier'));
    if (empty($identifier)) {
        return rest_ensure_response(null);
    }

    // A. Query by transaction_id (works seamlessly in both HPOS and legacy CPT)
    $orders = wc_get_orders([
        'limit' => 1,
        'transaction_id' => $identifier,
        'return' => 'objects',
    ]);

    if (!empty($orders)) {
        $controller = new WC_REST_Orders_Controller();
        return rest_ensure_response($controller->prepare_object_for_response($orders[0], $request)->get_data());
    }

    // B. Query by metadata keys
    $meta_keys = [
        '_stripe_intent_id',
        '_stripe_charge_id',
        '_paypal_capture_id',
        '_paypal_order_id',
    ];

    foreach ($meta_keys as $key) {
        $matched = wc_get_orders([
            'limit' => 1,
            'meta_key' => $key,
            'meta_value' => $identifier,
            'return' => 'objects',
        ]);
        if (!empty($matched)) {
            $controller = new WC_REST_Orders_Controller();
            return rest_ensure_response($controller->prepare_object_for_response($matched[0], $request)->get_data());
        }
    }

    return rest_ensure_response(null);
}
