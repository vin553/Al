// Custom Next.js server used to run the app under Plesk / Phusion Passenger.
//
// Plesk's Node.js hosting runs an "Application Startup File" (this file) and
// provides the port via the PORT environment variable. We hand every request
// to Next.js's own request handler. Requires a production build (`next build`)
// to have been run first, so `.next/` exists.
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res, parse(req.url, true));
    }).listen(port, () => {
      console.log(`Next.js server ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Next.js server:", err);
    process.exit(1);
  });
