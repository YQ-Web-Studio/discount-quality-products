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
        $method_id = strtolower($rate->get_method_id());

        // Strictly target statutory exempt postal services:
        // Must be explicitly Royal Mail universal service (not commercial couriers or standard-rated commercial services)
        $is_royal_mail = (strpos($label, 'royal mail') !== false || strpos($method_id, 'royal_mail') !== false);
        $is_first_class = (strpos($label, '1st class') !== false || strpos($label, 'first class') !== false);
        $is_commercial_courier = (strpos($label, 'courier') !== false || strpos($label, 'tracked') !== false || strpos($label, 'special delivery') !== false);

        // Allow explicit override via filter
        $is_exempt = apply_filters('dqp_is_shipping_rate_vat_exempt', ($is_royal_mail && $is_first_class && !$is_commercial_courier), $rate, $package);

        if ($is_exempt) {
            // Statutory exemption under UK VAT Act 1994, Schedule 9, Group 3 (Postal services provided by universal service provider)
            $rate->set_taxes(array());
        }
    }
    return $rates;
}
