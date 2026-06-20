<?php
/**
 * stripe-webhook.php — OPTIONAL stub (not required for v1).
 * ----------------------------------------------------------------------------
 * Stripe already emails receipts and records every donation in your Dashboard,
 * so the donation flow works without this file. This stub exists only so you
 * can later add reconciliation / bookkeeping (e.g. append each completed
 * donation to a log or accounting sheet) if you choose.
 *
 * To enable later:
 *   1. In the Stripe Dashboard → Developers → Webhooks, add an endpoint
 *      pointing to https://YOUR-DOMAIN/stripe-webhook.php
 *      subscribed to the event:  checkout.session.completed
 *   2. Copy the endpoint's "Signing secret" (whsec_...) into stripe-config.php:
 *          'webhook_secret' => 'whsec_...'
 *   3. Implement signature verification (see the commented sketch below) and
 *      your reconciliation logic.
 *
 * Until implemented, this endpoint simply acknowledges receipt with 200 so
 * Stripe does not retry. It performs NO actions.
 */

http_response_code(200);
header('Content-Type: text/plain; charset=utf-8');
echo 'ok';
exit;

/* ---------------------------------------------------------------------------
 * Reference sketch for when you implement reconciliation (kept inert above):
 *
 * $config = require __DIR__ . '/../stripe-config.php';
 * $secret = $config['webhook_secret'];
 * $payload = file_get_contents('php://input');
 * $sigHeader = isset($_SERVER['HTTP_STRIPE_SIGNATURE']) ? $_SERVER['HTTP_STRIPE_SIGNATURE'] : '';
 *
 * // Parse the "t=" timestamp and "v1=" signature(s) from $sigHeader,
 * // compute hash_hmac('sha256', $timestamp . '.' . $payload, $secret),
 * // and hash_equals() against the provided v1 signature. Reject if invalid
 * // or if the timestamp is too old (replay protection).
 *
 * $event = json_decode($payload, true);
 * if ($event['type'] === 'checkout.session.completed') {
 *     $session = $event['data']['object'];
 *     $eventId   = $session['metadata']['event_id']   ?? '';
 *     $label     = $session['metadata']['event_label'] ?? '';
 *     $amount    = ($session['amount_total'] ?? 0) / 100; // SGD
 *     // ... append to a log / accounting system here ...
 * }
 * http_response_code(200);
 * echo 'ok';
 * --------------------------------------------------------------------------- */
