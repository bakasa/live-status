# HN Show HN Draft

Title: Show HN: LiveStatus – Open-source uptime monitoring with live SVG badges for READMEs

Body:

I wanted a simple way to show uptime in my GitHub READMEs without paying for a third-party service or setting up a complex monitoring stack.

LiveStatus is a self-hostable uptime monitor that generates live SVG badges — similar to Shields.io badges, but dynamic and updated every 5 minutes.

Features:
- Add a live badge to any README or website — shows ONLINE/OFFLINE status + uptime %
- Public status page for each monitor with 24h/30d history
- Slack/Discord webhook alerts on status change
- Deploy on Railway in ~2 minutes, or anywhere Node.js runs
- SQLite-backed, no external dependencies

Demo instance (with badges for my own services): https://livestatus-production.up.railway.app

Gallery shows all public monitors: https://livestatus-production.up.railway.app/gallery

Tech: Node.js, Hono, better-sqlite3, TypeScript.

I built this because I wanted something simpler than Upptime (GitHub Actions based, slow) and more self-contained than uptimerobot/pingdom. It's one process — the health checker runs in-process on setInterval. No cron, no PagerDuty, no cloud dependencies.

Would love feedback on the badge design and the self-hosted setup experience.

https://github.com/bakasa/live-status
