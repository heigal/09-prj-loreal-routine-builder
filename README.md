# Project 9: L'Oreal Routine Builder

This project is a beginner-friendly beauty routine assistant.
Users can:

- Browse products by category
- Select products to build a custom routine
- Generate a routine with AI
- Ask follow-up questions in chat

## How API Security Works

- The browser never stores your OpenAI API key.
- The frontend calls a Cloudflare Worker URL.
- The Worker securely reads `OPENAI_API_KEY` from Cloudflare secrets.

## Local Setup

1. Keep `secrets.js` in the project root.
2. Set your Worker URL there:

```js
window.CLOUDFLARE_WORKER_URL = "https://YOUR-WORKER-SUBDOMAIN.workers.dev";
```

3. Open `index.html` with your live server.

## Deploy Cloudflare Worker (Backend)

Worker files are in `cloudflare/`:

- `cloudflare/worker.js`
- `cloudflare/wrangler.toml`

From the project root:

1. Install Wrangler globally (if needed):

```bash
npm install -g wrangler
```

2. Log in to Cloudflare:

```bash
wrangler login
```

3. Move into the Worker folder:

```bash
cd cloudflare
```

4. Add your OpenAI key as a secret:

```bash
wrangler secret put OPENAI_API_KEY
```

5. Deploy:

```bash
wrangler deploy
```

6. Copy the deployed Worker URL and paste it in `secrets.js`.

## Deploy Frontend

You can deploy the static frontend to GitHub Pages, Netlify, Cloudflare Pages, or similar.

Make sure your deployed frontend can reach your Worker URL set in `secrets.js`.

## Troubleshooting

- `Missing Worker URL`: Update `secrets.js` or `meta[name="cloudflare-worker-url"]` in `index.html`.
- `Missing OPENAI_API_KEY`: Run `wrangler secret put OPENAI_API_KEY` again and redeploy Worker.
- CORS errors: Confirm requests are going to your Worker URL and not directly to OpenAI.
