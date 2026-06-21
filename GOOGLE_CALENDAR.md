# Connecting Google Calendar

When connected, **every booking is pushed to your Google Calendar in real time**
(customer, cleaner, address, time) and removed if you delete the booking. The
app stays fully usable without this — it's an optional integration you switch on
from **Settings → Integrations**.

It's a two-part setup: a one-time admin step (create Google credentials), then a
one-click "Connect" inside the app.

## Part A — One-time setup (create Google credentials)

You only do this once.

1. Go to **https://console.cloud.google.com** and create (or pick) a project.
2. **Enable the Calendar API:** APIs & Services → Library → search **Google
   Calendar API** → **Enable**.
3. **Configure the consent screen:** APIs & Services → OAuth consent screen →
   choose **External** → fill in app name + your email → save. (You can leave it
   in "Testing" and add your own Google account as a test user.)
4. **Create the OAuth client:** APIs & Services → **Credentials** → **Create
   Credentials** → **OAuth client ID** → Application type **Web application**.
5. Under **Authorized redirect URIs**, add your live URL + `/api/google/callback`.
   Your Settings page shows the exact value to paste, e.g.:
   ```
   https://meimyanmar.onrender.com/api/google/callback
   ```
6. Click **Create**. Google shows a **Client ID** and **Client secret** — copy both.

## Part B — Add the credentials to the server

On **Render → your service → Environment**, add two environment variables, then
let it redeploy:

```
GOOGLE_CLIENT_ID      = <the Client ID from step 6>
GOOGLE_CLIENT_SECRET  = <the Client secret from step 6>
```

(Optionally `GOOGLE_REDIRECT_URI` if you want to pin it; otherwise the app
derives it from your domain automatically.)

## Part C — Connect (in the app)

1. Open the app → **Settings**. The Google Calendar card now shows a **Connect
   Google Calendar** button.
2. Click it, choose your Google account, and approve calendar access.
3. You'll land back on Settings showing **Connected as you@example.com**.

That's it. From now on, every new booking appears on that Google Calendar
instantly, and deleting a booking removes its event. Use **Disconnect** on the
Settings page to unlink at any time.

### Notes
- One Google account is connected for the whole business (the owner's calendar).
- Events use the **Asia/Singapore** timezone.
- Calendar sync is best-effort: if Google is briefly unreachable, the booking is
  still saved — it just won't have created the event that one time.
