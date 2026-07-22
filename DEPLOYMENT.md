# Deployment Guide

## Prerequisites

1. Cloudflare account (free tier works)
2. GitHub OAuth App (register at https://github.com/settings/developers)

## Setup Steps

### 1. Create D1 Database

```bash
npx wrangler d1 create livestatus-db
```

Copy the returned `database_id` into `wrangler.jsonc`.

### 2. Initialize Schema

```bash
npx wrangler d1 migrations apply livestatus-db --remote
```

### 3. Set Environment Variables

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put JWT_SECRET  # Generate a random 64-char string
npx wrangler secret put APP_URL     # e.g. https://livestatus.your-name.workers.dev
```

### 4. Deploy

```bash
npx wrangler deploy
```

### 5. Register GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Homepage URL: `https://livestatus.your-name.workers.dev`
4. Callback URL: `https://livestatus.your-name.workers.dev/auth/callback`
5. Copy Client ID and Client Secret to wrangler secrets (step 3)

## GitHub Actions CI/CD

Add these secrets to the GitHub repo:
- `CF_API_TOKEN` — Cloudflare API token with Workers + D1 permissions
- `CF_ACCOUNT_ID` — Cloudflare Account ID

After that, every push to `main` auto-deploys.
