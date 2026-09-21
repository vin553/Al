# Alangkaar venue MCP server

One server, two assistants. Claude and ChatGPT both read the same venue and
pricing data, and neither holds a copy of it.

Google Drive stays the single source of truth. The server reads the venue
folders at request time and caches for ten minutes; nothing in this repository
snapshots the data.

---

## Why a server rather than a shared folder

A shared Drive folder already lets both assistants read the files. What it
cannot do is stop an assistant quoting a rate it should not.

Three venues carry confidentiality terms in their own words:

- One hotel's catering policy reads *"CONFIDENTIAL planner-exclusive rates:
  never publish; no contact between hotel and the couple."*
- A country club asked that its partner rate *"is not shown; a 'from' price or
  our package price is fine."*
- A partner venue bills us one rate and the public another.

Every venue record also carries staff names, direct emails and mobile numbers.

Handed the raw folder, an assistant sees all of that as ordinary text. This
server classifies it and withholds what a customer-facing answer may not
include — so connecting ChatGPT does not mean trusting ChatGPT.

## Tools

| Tool | What it does |
|---|---|
| `list_venues` | The index: status, capacity, headline rate. Filters on status, minimum capacity, rental per guest. |
| `get_venue` | Full detail for one venue by id or name. |
| `search_venues` | Free text across names, terms, inclusions and catering policies. |
| `pricing_notation` | The tax and status vocabulary, with a worked `++` example. |
| `health` | Where data is being read from and how fresh it is. |

Tool descriptions carry the tax rules deliberately. They are the only thing a
fresh model sees before deciding what a number means.

## Audiences

Every tool takes an `audience`. It is decided by the transport, never by the
caller.

| | `customer` | `internal` |
|---|---|---|
| Public rates | yes | yes |
| Partner and negotiated rates | **withheld** | yes |
| Contractually confidential rates | **withheld** | yes |
| Venue staff contacts | **withheld** | yes |
| `NOT ALLOWED` venues | **hidden** | yes |

`customer` is the default everywhere. An unrecognised value falls back to it.

## Transports

**stdio** — `scripts/mcp-stdio.ts`. Runs on your own machine, so it serves the
`internal` audience. This is the one Claude uses.

**Streamable HTTP** — `app/api/mcp/route.ts`, served at `/api/mcp`. Serves
`customer` unless the caller presents `MCP_INTERNAL_TOKEN` as a bearer token.
This is the one ChatGPT uses.

---

## Setup

### 1. A Google service account

The server reads Drive as a service account rather than as you, so it keeps
working when you are not signed in.

1. In the [Google Cloud console](https://console.cloud.google.com/), create a
   project (or reuse one) and enable the **Google Drive API**.
2. Create a **service account**, then create a **JSON key** for it.
3. Copy the service account's email — it looks like
   `something@project-id.iam.gserviceaccount.com`.
4. In Google Drive, share the venue master folder with that email, **Viewer**
   access. Read-only is all the server ever needs.

### 2. Environment variables

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=something@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
VENUE_ROOT_FOLDER_ID=<the venue master folder's Drive id>

# Optional, for the remote endpoint:
MCP_INTERNAL_TOKEN=<long random string>   # grants the internal audience
MCP_PUBLIC_TOKEN=<long random string>     # required as ?k= on every request
```

The folder id is the last path segment of the folder's Drive URL.

Keep `GOOGLE_PRIVATE_KEY` on one line with literal `\n` escapes — the loader
converts them back.

With none of these set, the server serves the synthetic fixtures in
`data/fixtures` and `health` says so. That is how the tests run.

### 3. Deploy

The endpoint is a route in the existing Next.js app, so deploying the app
deploys the server. It needs a Node runtime, not an edge one — this is already
set in the route.

---

## Connecting Claude

Local, full internal access:

```bash
claude mcp add alangkaar-venues -- pnpm tsx scripts/mcp-stdio.ts
```

Or point Claude at the deployed endpoint and pass the internal token as a
bearer header, which Claude can do and ChatGPT cannot.

## Connecting ChatGPT

Requires Plus, Pro, Business, Enterprise or Edu, on the web.

1. **Settings → Connectors → Advanced → Developer mode.**
2. Add a connector with the server URL:
   `https://<your-domain>/api/mcp?k=<MCP_PUBLIC_TOKEN>`
3. Authentication: **None**.

On Pro, custom connectors are read-only, which suits a read-only server. Write
access needs a Business or Enterprise workspace, and this server exposes no
write tools regardless.

ChatGPT will only ever receive the `customer` view. There is no argument it can
pass, and no header it can send, that changes this.

---

## The security model, stated plainly

ChatGPT cannot authenticate to a custom MCP server in any way this server could
verify. OpenAI supports OAuth or no authentication, and explicitly does not
support machine-to-machine grants or customer-supplied API keys. Standing up an
OAuth authorization server for five read-only tools is disproportionate.

So the endpoint is built to be safe while unauthenticated:

- The default view contains nothing a venue asked us to withhold.
- The audience is overwritten server-side on every `tools/call`, so asking for
  `internal` does nothing.
- `MCP_PUBLIC_TOKEN` keeps the endpoint from being found by chance. It is not
  the control that protects the data — URL secrets leak through logs and
  referrer headers. The redaction is.

What this does **not** protect against: anyone holding the URL can read public
venue rates. Those are rates the venues themselves publish, but it is still a
list of where Alangkaar works. Treat the URL as semi-private.

## Running the tests

```bash
pnpm test:unit
```

32 tests. The ones that matter cover disclosure classification against each real
wording pattern, and the audience forcing that keeps the remote endpoint safe.

## Refreshing the data

Edit the venue folder in Drive. The server picks changes up within ten minutes,
or immediately on restart. There is nothing in this repository to re-sync.
