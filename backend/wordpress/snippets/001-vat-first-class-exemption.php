<?php
/**
 * Snippet Name: VAT Exemption for 1st Class Shipping
 * Description: Prevents standard VAT from applying to Royal Mail 1st Class postage in accordance with statutory UK postal regulations.
 * Scope: global
 * Ticket: DQP-1
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

add_filter('woocommerce_package_rates', 'dqp_adjust_first_class_shipping_tax', 10, 2);

function dqp_adjust_first_class_shipping_tax($rates, $package) {
    foreach ($rates as $rate_id => $rate) {
        $label = strtolower($rate->get_label());
        if (strpos($label, 'first class') !== false || strpos($label, '1st class') !== false) {
            // Royal Mail 1st class standard stamp and parcel rates are exempt from UK VAT
            $rate->set_taxes(array());
        }
    }
    return $rates;
}
