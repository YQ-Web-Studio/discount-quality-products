/**
 * Temporary Debug Endpoint to safely trigger batch feed generation
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'dqp/v1', '/trigger-batch-generate', array(
        'methods' => 'POST',
        'callback' => function() {
            $option_name = 'wf_feed_dqpfeed'