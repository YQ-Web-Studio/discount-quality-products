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
    if (!current_user_can('edit_product', $post_id)) {
        return;
    }

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
 * Add custom column to Product list to show verified stock status and provide data for Quick Edit.
 */
add_filter('manage_edit-product_columns', 'dqp_add_verified_stock_product_column', 20);
function dqp_add_verified_stock_product_column($columns) {
    $columns['dqp_verified_stock'] = __('Verified Stock', 'dqp');
    return $columns;
}

add_action('manage_product_posts_custom_column', 'dqp_render_verified_stock_product_column', 10, 2);
function dqp_render_verified_stock_product_column($column, $post_id) {
    if ($column === 'dqp_verified_stock') {
        $bypass = get_post_meta($post_id, '_bypass_low_stock_guard', true);
        $is_verified = ($bypass === 'yes' || has_term('verified-stock', 'product_tag', $post_id)) ? 'yes' : 'no';
        echo '<span class="dqp-verified-stock-status" data-verified="' . esc_attr($is_verified) . '">';
        if ($is_verified === 'yes') {
            echo '<mark class="order-status status-completed" style="background:#e5f6ea;color:#1e7e34;font-weight:600;padding:2px 6px;border-radius:4px;">&#10003; ' . esc_html__('Verified', 'dqp') . '</mark>';
        } else {
            echo '<span style="color:#999;">&mdash;</span>';
        }
        echo '</span>';
    }
}

/**
 * Add checkbox and hidden presence indicator to WooCommerce Quick Edit screen.
 */
add_action('woocommerce_product_quick_edit_end', 'dqp_quick_edit_verified_stock');
function dqp_quick_edit_verified_stock() {
    ?>
    <div class="inline-edit-group">
        <label class="alignleft">
            <input type="hidden" name="dqp_verified_stock_quick_edit_present" value="1">
            <input type="checkbox" name="_bypass_low_stock_guard" value="yes" class="dqp-quick-edit-bypass-checkbox">
            <span class="checkbox-title"><?php esc_html_e('Verified Low Stock (Allow purchase < 5 units)', 'dqp'); ?></span>
        </label>
    </div>
    <script type="text/javascript">
    jQuery(function($) {
        var wp_inline_edit = inlineEditPost.edit;
        inlineEditPost.edit = function(id) {
            wp_inline_edit.apply(this, arguments);
            var postId = 0;
            if (typeof(id) === 'object') {
                postId = parseInt(this.getId(id));
            }
            if (postId > 0) {
                var $postRow = $('#post-' + postId);
                var $editRow = $('#edit-' + postId);
                var isVerified = $postRow.find('.dqp-verified-stock-status').data('verified');
                $editRow.find('.dqp-quick-edit-bypass-checkbox').prop('checked', isVerified === 'yes');
            }
        };
    });
    </script>
    <?php
}

/**
 * Save Quick Edit value safely without resetting when not present.
 */
add_action('woocommerce_product_quick_edit_save', 'dqp_save_quick_edit_verified_stock');
function dqp_save_quick_edit_verified_stock($product) {
    // Only proceed if Quick Edit actually rendered this field
    if (!isset($_POST['dqp_verified_stock_quick_edit_present'])) {
        return;
    }

    $post_id = $product->get_id();
    if (!current_user_can('edit_product', $post_id)) {
        return;
    }

    $bypass = !empty($_POST['_bypass_low_stock_guard']) ? 'yes' : 'no';

    update_post_meta($post_id, '_bypass_low_stock_guard', $bypass);
    update_post_meta($post_id, 'bypass_low_stock_guard', $bypass);

    if ($bypass === 'yes') {
        wp_set_post_terms($post_id, 'verified-stock', 'product_tag', true);
    } else {
        wp_remove_object_terms($post_id, 'verified-stock', 'product_tag');
    }
}
