<?php
/**
 * Snippet Name: Lean Sitemap Product Slugs REST Endpoint
 * Description: High-performance indexed REST endpoint returning published visible product slugs and modified timestamps in chunks for full-catalogue sitemap generation (<150ms per chunk).
 * Scope: global
 * Ticket: DQP-18
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('dqp/v1', '/sitemap-products', [
        'methods' => 'GET',
        'callback' => 'dqp_rest_sitemap_products_handler',
        'permission_callback' => '__return_true',
        'args' => [
            'page' => [
                'required' => false,
                'type' => 'integer',
                'default' => 1,
                'sanitize_callback' => 'absint',
            ],
            'per_page' => [
                'required' => false,
                'type' => 'integer',
                'default' => 5000,
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);
});

/**
 * Return paginated published, catalog-visible WooCommerce product slugs + modified timestamps.
 *
 * Uses a single indexed SQL query ordered deterministically by ID ASC so chunk boundaries
 * never duplicate or skip products across sitemap pages.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function dqp_rest_sitemap_products_handler(WP_REST_Request $request) {
    global $wpdb;

    $page = max(1, (int) $request->get_param('page'));
    $per_page = (int) $request->get_param('per_page');
    if ($per_page < 1) {
        $per_page = 5000;
    } elseif ($per_page > 5000) {
        $per_page = 5000;
    }
    $offset = ($page - 1) * $per_page;

    // Exclude WooCommerce catalog-hidden products (matches WPGraphQL visibility: VISIBLE).
    $visibility_exclusion_sql = "
        AND NOT EXISTS (
            SELECT 1
            FROM {$wpdb->term_relationships} tr
            INNER JOIN {$wpdb->term_taxonomy} tt
                ON tr.term_taxonomy_id = tt.term_taxonomy_id
            INNER JOIN {$wpdb->terms} t
                ON tt.term_id = t.term_id
            WHERE tr.object_id = p.ID
              AND tt.taxonomy = 'product_visibility'
              AND t.name = 'exclude-from-catalog'
        )
    ";

    $total = (int) $wpdb->get_var("
        SELECT COUNT(*)
        FROM {$wpdb->posts} p
        WHERE p.post_type = 'product'
          AND p.post_status = 'publish'
          AND p.post_name <> ''
          {$visibility_exclusion_sql}
    ");

    $total_pages = $total > 0 ? (int) ceil($total / $per_page) : 0;

    $rows = [];
    if ($total > 0 && $offset < $total) {
        $sql = $wpdb->prepare("
            SELECT
                p.post_name AS slug,
                p.post_modified_gmt AS modified_gmt,
                p.post_date_gmt AS date_gmt
            FROM {$wpdb->posts} p
            WHERE p.post_type = 'product'
              AND p.post_status = 'publish'
              AND p.post_name <> ''
              {$visibility_exclusion_sql}
            ORDER BY p.ID ASC
            LIMIT %d OFFSET %d
        ", $per_page, $offset);

        $rows = $wpdb->get_results($sql);
    }

    $items = [];
    if (!empty($rows)) {
        foreach ($rows as $row) {
            $slug = trim((string) $row->slug);
            if ($slug === '') {
                continue;
            }

            $raw_gmt = (!empty($row->modified_gmt) && $row->modified_gmt !== '0000-00-00 00:00:00')
                ? (string) $row->modified_gmt
                : (string) $row->date_gmt;

            $iso_modified = (!empty($raw_gmt) && $raw_gmt !== '0000-00-00 00:00:00')
                ? str_replace(' ', 'T', $raw_gmt) . 'Z'
                : gmdate('Y-m-d\TH:i:s\Z');

            $items[] = [
                'slug' => $slug,
                'modified' => $iso_modified,
            ];
        }
    }

    $response = new WP_REST_Response([
        'total' => $total,
        'totalPages' => $total_pages,
        'page' => $page,
        'perPage' => $per_page,
        'items' => $items,
    ], 200);

    $response->header('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    return $response;
}
