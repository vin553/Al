<?php
/**
 * stripe-config.example.php  →  copy to  stripe-config.php  and fill in.
 * ----------------------------------------------------------------------------
 * NEVER commit the real stripe-config.php (it is .gitignored).
 *
 * PREFERRED placement: one level ABOVE the web root, e.g.
 *     /var/www/vhosts/example.com/stripe-config.php
 * so it is never served over HTTP. create-checkout-session.php looks for it at
 * ../stripe-config.php first, then falls back to the web-root copy.
 *
 * If you must keep it inside httpdocs, add the web-server deny rule shown in
 * README-DEPLOY.md so it cannot be fetched directly.
 *
 * Use sk_test_... while testing; switch to sk_live_... only when going live.
 */

return array(
    // Stripe secret key. Test mode: sk_test_...   Live mode: sk_live_...
    'secret_key' => 'sk_test_REPLACE_ME',

    // Your live site origin (scheme + host, no trailing slash). Used to
    // validate request origin and to build success/cancel redirect URLs.
    // TODO: confirm the temple's final domain before going live.
    'allowed_origin' => 'https://srivkt.org',
);
