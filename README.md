# LiveStatus

**Uptime monitoring with live SVG badges for your GitHub READMEs.**

Monitor your APIs, websites, and services. Get a dynamic SVG badge that shows live uptime status. Embed it in your README, dashboard, or any web page.

[![Auto-Company Site](https://livestatus-production.up.railway.app/badge/4)](https://livestatus-production.up.railway.app/status/4)
[![ReqDump](https://livestatus-production.up.railway.app/badge/5)](https://livestatus-production.up.railway.app/status/5)
[![SnapOG](https://livestatus-production.up.railway.app/badge/6)](https://livestatus-production.up.railway.app/status/6)

---

## Features

- **Live SVG Badges** — Add a dynamic badge to any README or website. Updates every 5 minutes.
- **Public Status Pages** — Every monitor gets a public status page with 24h and 30d uptime history.
- **Instant Alerts** — Get notified via Slack or Discord webhook when your service goes down.
- **Self-Hosted** — Deploy on Railway in 2 minutes. Your data, your infrastructure.
- **No Signup Required for Visitors** — Status pages and badges are public by default.

## Quick Deploy

Deploy to Railway in one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?template=https://github.com/bakasa/live-status)

Or deploy manually:

```bash
# Clone and install
git clone https://github.com/bakasa/live-status.git
cd live-status
npm install

# Set environment variables
export ADMIN_API_KEY=$(openssl rand -hex 16)
export JWT_SECRET=$(openssl rand -hex 32)
export APP_URL=http://localhost:3000

# Run
npm run start:dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ADMIN_API_KEY` | API key for dashboard login | Yes |
| `JWT_SECRET` | Secret for signing session tokens | Yes |
| `APP_URL` | Public URL of your instance | Yes |
| `DATA_DIR` | Directory for SQLite database (default: `./data`) | No |

## Usage

### 1. Sign In

Open your instance URL, click **Sign In**, and enter your `ADMIN_API_KEY`.

### 2. Create a Monitor

Add the name and URL of the service you want to monitor. Optionally configure a Slack/Discord webhook for alerts.

### 3. Add the Badge to Your README

Each monitor generates a badge embed code:

```markdown
[![LiveStatus](https://your-instance/badge/1)](https://your-instance/status/1)
```

This renders as: ![Example Badge](https://livestatus-production.up.railway.app/badge/2)

### 4. Share Your Status Page

Each monitor has a public status page at `/status/:id`. Share it with your users.

## GitHub Integration

### Add Badges to Your Repository README

Each monitor generates a badge embed code. Paste it in your `README.md`:

```markdown
[![LiveStatus](https://your-instance.up.railway.app/badge/1)](https://your-instance.up.railway.app/status/1)
```

This renders a live SVG badge showing your service status and 24h uptime.

### GitHub Actions: Deploy Notifier

Get your badge to update instantly after deployment. Add this step after your deploy job:

```yaml
- name: Notify LiveStatus
  uses: bakasa/live-status-action@v1
  with:
    api-key: ${{ secrets.LIVESTATUS_API_KEY }}
    monitor-id: "1"
```

The action triggers an immediate health check and outputs the badge markdown.
See [github.com/bakasa/live-status-action](https://github.com/bakasa/live-status-action) for full docs.

### GitHub Actions: Auto-Register on Deploy

Want to automatically create/update a monitor when you deploy? Add this workflow (`.github/workflows/livestatus.yml`):

```yaml
name: Register LiveStatus Monitor
on:
  deployment_status:
jobs:
  register:
    if: github.event_name == 'deployment_status' && github.event.deployment_state == 'success'
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST https://your-instance.up.railway.app/api/monitors \
            -H "Authorization: Bearer ${{ secrets.LIVESTATUS_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"name":"${{ github.event.repository.full_name }}","url":"${{ github.event.deployment.payload.web_url || github.event.deployment.environment_url }}"}'
```

Set `LIVESTATUS_KEY` as a repository secret with your admin API key.

### GitHub Deployment Status Checks

Use the public status page URL in your GitHub repo's **Website** field (repo → About → Website) so visitors can see your uptime at a glance.

## API

All API endpoints require authentication via Bearer token or session cookie.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/login` | Sign in with API key |
| `GET` | `/api/monitors` | List monitors |
| `POST` | `/api/monitors` | Create monitor (`name`, `url`, `webhook?`) |
| `DELETE` | `/api/monitors/:id` | Delete monitor |
| `PATCH` | `/api/monitors/:id` | Update monitor webhook |
| `POST` | `/api/monitors/:id/test-webhook` | Send test webhook notification |
| `POST` | `/api/monitors/:id/check` | Trigger immediate health check |
| `POST` | `/api/reseed` | Reset demo monitors |
| `GET` | `/badge/:id` | SVG badge (public) |
| `GET` | `/status/:id` | Status page (public) |
| `GET` | `/gallery` | Public gallery of all monitors |

## Tech Stack

- **Runtime**: Node.js 20 (Hono + @hono/node-server)
- **Database**: SQLite (better-sqlite3)
- **Auth**: API key + JWT session cookies
- **Badges**: Server-side rendered SVG
- **Deploy**: Railway, any Node.js host

## Deployment

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up

# Set variables
railway variables set ADMIN_API_KEY=your-key JWT_SECRET=your-secret APP_URL=https://your-instance.up.railway.app

# Add domain
railway domain
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## License

MIT
