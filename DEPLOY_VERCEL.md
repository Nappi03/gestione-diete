Vercel Deployment Guide

1) Create project on Vercel
- Go to https://vercel.com/new and import your GitHub repository (or connect GitLab/Bitbucket).
- Framework Preset: Next.js (detected automatically).

2) Build & Install settings
- Build Command: `npm run build`
- Output Directory: (leave blank for Next.js)
- Install Command: `npm ci` or `npm install`

3) Environment Variables (set in both Preview & Production as needed)
- `NEXT_PUBLIC_SUPABASE_URL` = https://iiilayypfskhetxvmvis.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = <your anon/publishable key>
- `SUPABASE_SERVICE_ROLE_KEY` = <your service role key>  (set as "Environment Variable" but mark as secret; only used server-side)
- `PASSWORD_DB_SUPABASE` = <alternate service key if you used this locally>
- No external PDF service is required anymore; `/api/generate-pdf` runs inside Next.js.

4) Use Vercel CLI to set secrets (optional but recommended for automation)
- Install CLI: `npm i -g vercel`
- Login: `vercel login`
- Link project: in repo root run `vercel --local-config vercel.json` or `vercel link`

- Example of setting a secret and env var:

```bash
# create a secret (only value stored):
vercel secrets add supabase-service-key "<your service role key>"

# set environment variable referencing secret for production:
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# when prompted choose "From Secret" and pick the secret you added

# set public env vars:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

5) PDF generation

PDF generation now happens directly inside the Next.js app through `/api/generate-pdf`.

- In the app, verify patient listing, diet saving, and PDF export work.

E2E testing locally

1. Start the Next.js dev server from repo root:

```bash
npm run dev
```

2. Run the E2E script (it will create a patient, save a diet, and request a PDF):

```bash
node scripts/e2e-test.js
```

If your dev server is on a different port or host, set `BASE_URL` when running the test script, for example `BASE_URL=http://localhost:3001 node scripts/e2e-test.js`.

7) Rollback
- Use Vercel dashboard to rollback deployments if needed.

If you want, I can:
- Add an example `vercel env` script file to automate setting env vars,
- Update the internal PDF route if you need different rendering behavior, or
- Run `vercel` CLI commands here if you provide Vercel authentication (not recommended to share tokens in chat).