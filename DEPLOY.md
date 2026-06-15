# Putting the app online (shareable link)

The goal: a URL you can open on any phone/laptop and send to the client.

## Recommended: Render (free)

The repo includes a `render.yaml` blueprint, so this is almost one-click.

1. Go to **https://render.com** and **Sign up** with your **GitHub** account
   (the one that has the `vin553/Al` repo).
2. Click **New +** (top right) → **Blueprint**.
3. Choose the **`vin553/Al`** repository and click **Connect / Apply**.
   Render reads `render.yaml` automatically and sets everything up — it deploys
   the `claude/magical-pasteur-d84lsc` branch.
4. Click **Apply** / **Create**. The first build takes ~3–5 minutes.
5. When it finishes, Render shows a URL like
   `https://meimyanmar-bookings.onrender.com` — **that's your shareable link.**

That's it. Open the link to see the dashboard, calendar, all jobs, and create
bookings / send WhatsApp confirmations.

### Good to know on the free tier
- The service **sleeps after ~15 min of inactivity**; the next visit takes
  ~30–60 seconds to wake up, then it's fast. (A paid plan, ~US$7/mo, stays awake.)
- Data is **seeded fresh from the schedule on every deploy** — the 380 May/June
  jobs are always there. Bookings you add live during a demo persist until the
  next deploy/restart. To keep new bookings permanently, we'd add a small
  always-on database (a 15-minute change — just ask).

## Alternative: Railway

Same idea at **https://railway.app** → New Project → Deploy from GitHub →
pick `vin553/Al`. Set the start command to `pnpm start` and build to
`corepack enable && pnpm install && pnpm build` if it doesn't auto-detect.

## Note on Vercel

Vercel works for most Next.js apps, but this one stores data in a local file,
which Vercel's serverless functions can't keep. To use Vercel we'd swap to a
hosted database (e.g. Postgres) first. Render/Railway above need no such change.
