# Deployment Guide

## Prerequisites

- Railway account
- GitHub account for pushing code

## Quick Deploy (Existing Railway Project)

```bash
# Link to the auto-company project
railway link -p 18c296f6-b414-470b-b9c4-89724db03b80

# Set environment variables
railway variables set --service livestatus \
  ADMIN_API_KEY=$(openssl rand -hex 16) \
  JWT_SECRET=$(openssl rand -hex 32) \
  APP_URL=https://livestatus-production.up.railway.app

# Deploy
railway up --service livestatus
```

## Setup Steps

### 1. Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_API_KEY` | API key for dashboard login | `ls-admin-abc123` |
| `JWT_SECRET` | Secret for signing JWT session tokens | 64-char hex string |
| `APP_URL` | Public URL of the service | `https://livestatus-production.up.railway.app` |

### 2. Deploy

```bash
# From the project root
railway up --service livestatus
```

### 3. Generate Public Domain

```bash
railway domain -s livestatus
```

### 4. Verify

```bash
# Login with your API key
curl -X POST https://<your-url>/api/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"<your-admin-api-key>"}'

# Create a monitor
curl -X POST https://<your-url>/api/monitors \
  -H "Authorization: Bearer <your-admin-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Service","url":"https://example.com/health"}'
```

## Tech Stack

- **Runtime**: Node.js 20 (Hono + @hono/node-server)
- **Database**: SQLite (better-sqlite3) stored in `data/` directory
- **Auth**: API key + JWT session cookies
- **Cron**: In-process setInterval (5-minute health checks)

## Data Persistence

SQLite database is stored at `data/livestatus.db`. On Railway, use the volume mount feature to persist data across deploys.
