<?php
/**
 * Sri Veeramakaliamman Temple — Stripe Checkout Session creator
 * ----------------------------------------------------------------------------
 * Pure PHP + cURL. No Composer, no Stripe PHP SDK. Deploys by file-upload.
 *
 * Flow:
 *   1. Receives JSON: { amountSGD, eventId, donorName?, donorEmail? }
 *   2. Re-validates amount and maps eventId -> a fixed server-owned label.
 *      The client's label/price is NEVER trusted.
 *   3. Creates a Stripe Checkout Session (mode=payment, currency=sgd).
 *   4. Returns { url } for the browser to redirect to.
 *
 * Security:
 *   - Secret key lives in stripe-config.php (ideally ABOVE the web root).
 *   - Returns JSON only; never echoes the secret key.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/* --------------------------------------------------------------------------
 * Load config. Prefer a copy ONE LEVEL ABOVE the web root (not web-served).
 * Falls back to the web-root copy (which must be denied via server rules —
 * see README-DEPLOY.md).
 * ------------------------------------------------------------------------ */
$configPaths = array(
    __DIR__ . '/../stripe-config.php',   // preferred: outside httpdocs
    __DIR__ . '/stripe-config.php',      // fallback: inside httpdocs (deny via web server)
);
$config = null;
foreach ($configPaths as $path) {
    if (is_readable($path)) {
        $config = require $path;
        break;
    }
}

function fail($httpCode, $message) {
    http_response_code($httpCode);
    echo json_encode(array('error' => $message));
    exit;
}

if (!is_array($config) || empty($config['secret_key'])) {
    fail(500, 'Server is not configured for donations yet. Please contact the temple office.');
}

$secretKey    = $config['secret_key'];
$allowedOrigin = isset($config['allowed_origin']) ? $config['allowed_origin'] : '';

/* --------------------------------------------------------------------------
 * Method + origin checks
 * ------------------------------------------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Method not allowed.');
}

// Light CSRF mitigation: if an allowed_origin is configured, require the
// request's Origin (or Referer) to match it. Skipped when not configured.
if ($allowedOrigin) {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    if (!$origin && isset($_SERVER['HTTP_REFERER'])) {
        $parts = parse_url($_SERVER['HTTP_REFERER']);
        if ($parts && isset($parts['scheme'], $parts['host'])) {
            $origin = $parts['scheme'] . '://' . $parts['host'];
            if (isset($parts['port'])) { $origin .= ':' . $parts['port']; }
        }
    }
    if ($origin && stripos($origin, rtrim($allowedOrigin, '/')) !== 0) {
        fail(403, 'Origin not allowed.');
    }
}

/* --------------------------------------------------------------------------
 * Parse + validate input
 * ------------------------------------------------------------------------ */
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    fail(400, 'Invalid request.');
}

// Server-owned allow-list: eventId => human label. Client labels are ignored.
$CAUSES = array(
    'general'    => 'Temple Fund (General Donation)',
    'annadhanam' => 'Annadhanam — Sponsor Free Meals',
    'abishekam'  => 'Abishekam / Archanai Sponsorship',
    'aadi'       => 'Aadi Thiruvizha Festival',
    'navaratri'  => 'Navaratri Kolu',
    'deepavali'  => 'Deepavali Chariot Procession (Ther)',
    'thaipusam'  => 'Thaipusam',
    'renovation' => 'Kumbhabishekam / Building Fund',
);

$eventId = isset($input['eventId']) ? (string) $input['eventId'] : '';
if (!isset($CAUSES[$eventId])) {
    fail(400, 'Unknown donation cause.');
}
$label = $CAUSES[$eventId];

// Amount: must be a positive whole number of SGD, within bounds.
$amountSGD = isset($input['amountSGD']) ? $input['amountSGD'] : null;
if (!is_numeric($amountSGD)) {
    fail(400, 'Invalid amount.');
}
$amountSGD = (float) $amountSGD;
if (floor($amountSGD) != $amountSGD) {
    fail(400, 'Please donate a whole-dollar amount.');
}
$amountSGD = (int) $amountSGD;
if ($amountSGD < 1 || $amountSGD > 100000) {
    fail(400, 'Amount out of allowed range.');
}
$amountCents = $amountSGD * 100;

// Optional donor details (sanitised; Stripe will collect/validate email too).
$donorName  = isset($input['donorName'])  ? trim((string) $input['donorName'])  : '';
$donorEmail = isset($input['donorEmail']) ? trim((string) $input['donorEmail']) : '';
$donorName  = mb_substr($donorName, 0, 120);
if ($donorEmail && !filter_var($donorEmail, FILTER_VALIDATE_EMAIL)) {
    $donorEmail = ''; // ignore malformed email rather than fail the donation
}

/* --------------------------------------------------------------------------
 * Build success/cancel URLs from the current host (works on any domain).
 * ------------------------------------------------------------------------ */
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host   = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
$dir    = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$base   = $scheme . '://' . $host . $dir;
// If allowed_origin is set, prefer it as the canonical base for redirects.
if ($allowedOrigin) {
    $base = rtrim($allowedOrigin, '/');
}

$successUrl = $base . '/success.html?session_id={CHECKOUT_SESSION_ID}';
$cancelUrl  = $base . '/cancelled.html';

/* --------------------------------------------------------------------------
 * Build Stripe params (form-encoded, with nested keys).
 * ------------------------------------------------------------------------ */
$params = array(
    'mode' => 'payment',
    'success_url' => $successUrl,
    'cancel_url'  => $cancelUrl,
    'submit_type' => 'donate',

    'line_items[0][quantity]' => 1,
    'line_items[0][price_data][currency]' => 'sgd',
    'line_items[0][price_data][unit_amount]' => $amountCents,
    'line_items[0][price_data][product_data][name]' => 'Donation — ' . $label,
    'line_items[0][price_data][product_data][description]'
        => 'Sri Veeramakaliamman Temple, Singapore',

    'metadata[event_id]'    => $eventId,
    'metadata[event_label]' => $label,
    'metadata[donor_name]'  => $donorName,
);

if ($donorEmail) {
    $params['customer_email'] = $donorEmail;
}
if ($donorName) {
    $params['payment_intent_data[description]'] =
        'Donation (' . $label . ') from ' . $donorName;
}

$postFields = http_build_query($params, '', '&');

/* --------------------------------------------------------------------------
 * Call Stripe via cURL
 * ------------------------------------------------------------------------ */
if (!function_exists('curl_init')) {
    fail(500, 'Server is missing cURL support. Please contact the temple office.');
}

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $postFields,
    CURLOPT_HTTPHEADER     => array(
        'Authorization: Bearer ' . $secretKey,
        'Content-Type: application/x-www-form-urlencoded',
    ),
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
));

$response = curl_exec($ch);
$curlErr  = curl_error($ch);
$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    error_log('Stripe cURL error: ' . $curlErr);
    fail(502, 'Could not reach the payment provider. Please try again shortly.');
}

$data = json_decode($response, true);

if ($status >= 200 && $status < 300 && isset($data['url'])) {
    echo json_encode(array('url' => $data['url']));
    exit;
}

// Log the real Stripe error server-side; return a clean message to the user.
$detail = isset($data['error']['message']) ? $data['error']['message'] : 'Unknown error';
error_log('Stripe API error (' . $status . '): ' . $detail);
fail(502, 'The payment provider rejected the request. Please try again or contact the temple office.');
