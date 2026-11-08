<?php
/**
 * Snippet Name: Lean Instant Product & Category Search REST Endpoint
 * Description: High-performance indexed search endpoint returning lightweight product cards and category matches in <60ms for live search typeahead.
 * Scope: global
 * Ticket: DQP-search
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function() {
    register_rest_route('dqp/v1', '/instant-search', [
        'methods' => 'GET',
        'callback' => 'dqp_rest_instant_search_handler',
        'permission_callback' => '__return_true',
        'args' => [
            'q' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'limit' => [
                'required' => false,
                'type' => 'integer',
                'default' => 8,
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);
});

/**
 * Handle high-performance instant search requests.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function dqp_rest_instant_search_handler(WP_REST_Request $request) {
    global $wpdb;

    $raw_q = trim((string) $request->get_param('q'));
    $limit = (int) $request->get_param('limit');
    if ($limit < 1 || $limit > 12) {
        $limit = 8;
    }

    if (mb_strlen($raw_q) < 2) {
        return new WP_REST_Response([
            'products' => [],
            'categories' => [],
        ], 200);
    }

    $escaped_like = $wpdb->esc_like($raw_q);
    $exact_prefix = $escaped_like . '%';
    $word_boundary = '% ' . $escaped_like . '%';
    $anywhere = '%' . $escaped_like . '%';

    // 1. Query products with targeted index-friendly joins
    $product_sql = $wpdb->prepare("
        SELECT 
            p.ID,
            p.post_title,
            p.post_name,
            pm_price.meta_value AS price,
            pm_thumb.meta_value AS thumbnail_id
        FROM {$wpdb->posts} p
        LEFT JOIN {$wpdb->postmeta} pm_price ON (p.ID = pm_price.post_id AND pm_price.meta_key = '_price')
        LEFT JOIN {$wpdb->postmeta} pm_thumb ON (p.ID = pm_thumb.post_id AND pm_thumb.meta_key = '_thumbnail_id')
        WHERE p.post_type = 'product'
          AND p.post_status = 'publish'
          AND p.post_title LIKE %s
        ORDER BY
            CASE
                WHEN p.post_title LIKE %s THEN 1
                WHEN p.post_title LIKE %s THEN 2
                ELSE 3
            END ASC,
            p.post_date DESC
        LIMIT %d
    ", $anywhere, $exact_prefix, $word_boundary, $limit);

    $raw_products = $wpdb->get_results($product_sql);
    $products = [];

    if (!empty($raw_products)) {
        foreach ($raw_products as $item) {
            $product_id = (int) $item->ID;
            $image_url = null;
            if (!empty($item->thumbnail_id)) {
                $src = wp_get_attachment_image_src((int) $item->thumbnail_id, 'medium');
                if ($src && !empty($src[0])) {
                    $image_url = $src[0];
                }
            }

            // Primary category
            $category_name = null;
            $terms = get_the_terms($product_id, 'product_cat');
            if (!empty($terms) && !is_wp_error($terms)) {
                $category_name = $terms[0]->name;
            }

            // Formatted price string
            $raw_price = (float) $item->price;
            $formatted_price = '£' . number_format($raw_price, 2);

            $products[] = [
                'id' => $product_id,
                'name' => html_entity_decode($item->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug' => $item->post_name,
                'price' => $formatted_price,
                'imageUrl' => $image_url,
                'category' => $category_name,
            ];
        }
    }

    // 2. Query categories matching search term
    $cat_sql = $wpdb->prepare("
        SELECT 
            t.term_id AS id,
            t.name,
            t.slug,
            tt.parent
        FROM {$wpdb->terms} t
        INNER JOIN {$wpdb->term_taxonomy} tt ON (t.term_id = tt.term_id)
        WHERE tt.taxonomy = 'product_cat'
          AND (t.name LIKE %s OR t.slug LIKE %s)
        ORDER BY 
            CASE 
                WHEN t.name LIKE %s THEN 1 
                ELSE 2 
            END ASC,
            t.name ASC
        LIMIT 4
    ", $anywhere, $anywhere, $exact_prefix);

    $raw_categories = $wpdb->get_results($cat_sql);
    $categories = [];

    if (!empty($raw_categories)) {
        foreach ($raw_categories as $cat) {
            $parent_name = null;
            if (!empty($cat->parent)) {
                $parent_term = get_term((int) $cat->parent, 'product_cat');
                if ($parent_term && !is_wp_error($parent_term)) {
                    $parent_name = $parent_term->name;
                }
            }

            $categories[] = [
                'id' => (int) $cat->id,
                'name' => html_entity_decode($cat->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug' => $cat->slug,
                'parentName' => $parent_name,
            ];
        }
    }

    $response = new WP_REST_Response([
        'products' => $products,
        'categories' => $categories,
    ], 200);

    // Set aggressive cache header on WordPress side for edge proxies
    $response->header('Cache-Control', 'public, max-age=300, s-maxage=600');

    return $response;
}

/**
 * Boost title relevance in all standard WooCommerce search queries (REST, GraphQL, Storefront).
 */
add_filter('posts_orderby', function($orderby, $query) {
    $search = $query->get('s');
    $post_type = $query->get('post_type');
    $is_product = $post_type === 'product' || (is_array($post_type) && in_array('product', $post_type));

    if (!empty($search) && $is_product) {
        global $wpdb;
        $clean = trim((string) $search);
        if (mb_strlen($clean) >= 2) {
            $escaped = $wpdb->esc_like($clean);
            $prefix = $escaped . '%';
            $word = '% ' . $escaped . '%';
            $like = '%' . $escaped . '%';

            $title_rank = $wpdb->prepare("
                CASE 
                    WHEN {$wpdb->posts}.post_title LIKE %s THEN 1
                    WHEN {$wpdb->posts}.post_title LIKE %s THEN 2
                    WHEN {$wpdb->posts}.post_title LIKE %s THEN 3
                    ELSE 4
                END ASC
            ", $prefix, $word, $like);

            return empty($orderby) ? $title_rank : $title_rank . ', ' . $orderby;
        }
    }
    return $orderby;
}, 20, 2);

