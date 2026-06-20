# Buddy Gemini proxy (Cloudflare Worker)

A tiny Worker that keeps the Gemini API key **server-side**. The app calls this
Worker instead of Google directly, so the key never ships in the public bundle.

## One-time setup

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up).

From this `proxy/` folder:

```bash
cd proxy

# 1. Log in to Cloudflare (opens a browser)
npx wrangler login

# 2. Store your Gemini key as a secret (paste the key when prompted)
npx wrangler secret put GEMINI_API_KEY

# 2b. (optional) Store your TMDB key for movie posters (paste when prompted)
npx wrangler secret put TMDB_API_KEY

# 3. Deploy the Worker
npx wrangler deploy
```

Step 3 prints your Worker URL, e.g.:

```
https://buddy-gemini.<your-subdomain>.workers.dev
```

Copy that URL — it's the proxy URL the app uses.

## Point the app at the proxy

- **Deployed site (GitHub Pages):** add a repository **Variable** (not a secret)
  named `REACT_APP_GEMINI_PROXY_URL` set to the Worker URL
  (GitHub → repo Settings → Secrets and variables → Actions → Variables tab).
  The deploy workflows pass it into the build. No Gemini key needed in GitHub.

- **Local dev:** leave `REACT_APP_GEMINI_PROXY_URL` unset and keep using your
  `.env.local` key directly. (Optional: set it in `.env.local` to test the proxy
  path locally.)

## Updating later

- Change the key: `npx wrangler secret put GEMINI_API_KEY` (re-deploy not needed).
- Change code/allowed origins: edit `worker.js`, then `npx wrangler deploy`.

## Notes

- `worker.js` only forwards `POST /v1beta/models/...` calls and restricts CORS to
  your site + localhost — it is not an open proxy for arbitrary requests.
- Free tier is 100k requests/day, far more than this app needs.
