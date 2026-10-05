<?php
/**
 * Snippet Name: Verified Low Stock Guard Bypass Checkbox
 * Description: Adds a 1-click checkbox to WooCommerce product inventory settings and quick edit to bypass the low-stock inquiry guard when inventory is physically verified.
 * Scope: admin
 * Ticket: DQP-4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Register post meta so it is exposed cleanly in the WooCommerce REST API.
 */
add_action('init', 'dqp_register_verified_stock_meta');
function dqp_register_verified_stock_meta() {
    register_post_meta('product', '_bypass_low_stock_guard', array(
        'show_in_rest' => true,
        'single'       => true,
        'type'         => 'string',
        'auth_callback' => function() {
            return current_user_can('edit_products');
        }
    ));

    register_post_meta('product', 'bypass_low_stock_guard', array(
        'show_in_rest' => true,
        'single'       => true,
        'type'         => 'string',
        'auth_callback' => function() {
            return current_user_can('edit_products');
        }
    ));
}

/**
 * Render checkbox inside WooCommerce Product Data -> Inventory tab.
 */
add_action('woocommerce_product_options_inventory_product_data', 'dqp_render_verified_stock_checkbox');
function dqp_render_verified_stock_checkbox() {
    echo '<div class="options_group show_if_simple show_if_variable">';
    woocommerce_wp_checkbox(array(
        'id'            => '_bypass_low_stock_guard',
        'label'         => __('Verified Low Stock', 'dqp'),
        'description'   => __('Allow online purchase when stock is under 5 units (physically verified in warehouse).', 'dqp'),
        'desc_tip'      => false,
    ));
    echo '</div>';
}

/**
 * Save checkbox value on standard product save.
 */
add_action('woocommerce_process_product_meta', 'dqp_save_verified_stock_checkbox');
function dqp_save_verified_stock_checkbox($post_id) {
    $bypass = isset($_POST['_bypass_low_stock_guard']) ? 'yes' : 'no';
    update_post_meta($post_id, '_bypass_low_stock_guard', $bypass);
    update_post_meta($post_id, 'bypass_low_stock_guard', $bypass);

    // Keep verified-stock product tag in sync for easy filtering
    if ($bypass === 'yes') {
        wp_set_post_terms($post_id, 'verified-stock', 'product_tag', true);
    } else {
        wp_remove_object_terms($post_id, 'verified-stock', 'product_tag');
    }
}

/**
 * Add checkbox to WooCommerce Quick Edit screen.
 */
add_action('woocommerce_product_quick_edit_end', 'dqp_quick_edit_verified_stock');
function dqp_quick_edit_verified_stock() {
    ?>
    <div class="inline-edit-group">
        <label class="alignleft">
            <input type="checkbox" name="_bypass_low_stock_guard" value="yes">
            <span class="checkbox-title"><?php esc_html_e('Verified Low Stock (Allow purchase < 5 units)', 'dqp'); ?></span>
        </label>
    </div>
    <?php
}

/**
 * Save Quick Edit value.
 */
add_action('woocommerce_product_quick_edit_save', 'dqp_save_quick_edit_verified_stock');
function dqp_save_quick_edit_verified_stock($product) {
    $post_id = $product->get_id();
    if (isset($_POST['_bypass_low_stock_guard'])) {
        $bypass = 'yes';
    } else {
        $bypass = 'no';
    }
    update_post_meta($post_id, '_bypass_low_stock_guard', $bypass);
    update_post_meta($post_id, 'bypass_low_stock_guard', $bypass);

    if ($bypass === 'yes') {
        wp_set_post_terms($post_id, 'verified-stock', 'product_tag', true);
    } else {
        wp_remove_object_terms($post_id, 'verified-stock', 'product_tag');
    }
}
