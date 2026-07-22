# r/selfhosted Post Draft

Title: I built a self-hosted uptime monitor with live SVG badges for READMEs

Body:

I wanted a dead-simple way to show uptime in my project READMEs. Most solutions were either:
- SaaS-based with a monthly fee
- Too complex (Kubernetes, multiple containers)
- GitHub Actions-based (too slow for real-time badges)

So I built LiveStatus:

**What it does:**
- Monitor any URL's uptime (checks every 5 minutes)
- Generates a live SVG badge you can embed in READMEs, dashboards, or websites
- Shows ONLINE / OFFLINE status + 24h uptime % on the badge
- Each monitor has a public status page with 30-day history
- Sends Slack/Discord alerts when a service goes down

**Why self-hosted:**
- Single Node.js process. SQLite backend. No Docker required.
- Deploy on Railway in 2 minutes, or on any VPS
- Your data stays on your infra

**Quick start:**
```bash
git clone https://github.com/bakasa/live-status
cd live-status
npm install
ADMIN_API_KEY=my-key JWT_SECRET=$(openssl rand -hex 32) APP_URL=http://localhost:3000 npm run start:dev
```

Or one-click deploy on Railway (button in README).

Live demo: https://livestatus-production.up.railway.app
Gallery: https://livestatus-production.up.railway.app/gallery
Repo: https://github.com/bakasa/live-status

Would love to hear what features you'd want in a minimal uptime monitor!
