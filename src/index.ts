import { Hono, Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { db, getDb, migrate as runMigrations } from './db.js';
import * as auth from './auth.js';
import { generateBadge } from './badge.js';
import { runHealthChecks, checkSingleMonitor, sendWebhookAlert } from './monitor.js';
import { views } from './views.js';
import { User } from './db.js';

runMigrations(getDb());

const d = db();
if (!d.getUserByUsername('admin')) {
  d.upsertUser('admin');
}

function seedDemoMonitors(): void {
  const allMonitors = d.getAllMonitors();
  if (allMonitors.length > 0) return;

  const adminUser = d.getUserByUsername('admin')!;
  if (!adminUser) {
    console.warn('No admin user found, skipping seed');
    return;
  }

  const demos = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'GitHub', url: 'https://www.github.com' },
    { name: 'npm', url: 'https://www.npmjs.com' },
    { name: 'Auto-Company Site', url: 'https://company-site-production-9f58.up.railway.app' },
    { name: 'ReqDump', url: 'https://reqdump-production.up.railway.app' },
    { name: 'SnapOG', url: 'https://snapog-production.up.railway.app' },
  ];
  for (const demo of demos) {
    const created = d.createMonitor(adminUser.id, demo.name, demo.url);
    d.updateMonitorStatus(created.id, 'online');
    d.updateMonitorUptime(created.id, 100.0, 99.98);
    for (let i = 0; i < 24; i++) {
      const isOnline = (demo.name === 'npm' && i === 3) ? 0 : 1;
      const checkedAt = new Date(Date.now() - (23 - i) * 3600 * 1000);
      d.saveHealthCheckRaw(created.id, isOnline === 1 ? 200 : 500, isOnline === 1 ? 120 + Math.random() * 300 : null, isOnline, checkedAt);
    }
  }
  console.log('Seeded 3 demo monitors');
}

seedDemoMonitors();

type Variables = { user: User };

const app = new Hono<{ Variables: Variables }>();
app.use('*', cors());

function getAppUrl(c: Context): string {
  return process.env.APP_URL || `${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`;
}

async function requireAuth(c: Context, next: Next) {
  const user = await auth.authenticateRequest(c);
  if (!user) {
    if (c.req.header('Accept')?.includes('text/html')) {
      return c.redirect('/login');
    }
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', user);
  await next();
}

app.get('/', async (c) => {
  const user = await auth.getSessionUser(c);
  if (user) return c.redirect('/dashboard');
  return c.html(views.landing());
});

app.get('/login', async (c) => {
  const user = await auth.getSessionUser(c);
  if (user) return c.redirect('/dashboard');
  return c.html(views.loginPage());
});

app.post('/api/login', async (c) => {
  const body = await c.req.json<{ apiKey: string }>();
  if (!body.apiKey || !auth.validateApiKey(body.apiKey)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }
  const user = auth.getAdminUser();
  const token = await auth.createSessionToken(user.id, user.username);
  auth.setSessionCookie(c, token);
  return c.json({ ok: true });
});

app.get('/auth/logout', async (c) => {
  auth.clearSessionCookie(c);
  return c.redirect('/');
});

app.get('/dashboard', requireAuth, async (c) => {
  const user = c.var.user;
  const monitors = d.getMonitorsByUser(user.id);
  return c.html(views.dashboard(user, monitors, getAppUrl(c)));
});

app.post('/api/monitors', requireAuth, async (c) => {
  const user = c.var.user;
  const body = await c.req.json<{ name: string; url: string; webhook?: string }>();
  if (!body.name || !body.url) {
    return c.json({ error: 'Name and URL are required' }, 400);
  }
  try { new URL(body.url); } catch { return c.json({ error: 'Invalid URL' }, 400); }

  const monitors = d.getMonitorsByUser(user.id);
  if (monitors.length >= 3) {
    return c.json({ error: 'Free tier limit: 3 monitors. Delete one first.' }, 403);
  }

  const monitor = d.createMonitor(user.id, body.name.trim(), body.url.trim());
  if (body.webhook) {
    d.updateMonitorWebhook(monitor.id, user.id, body.webhook.trim());
    monitor.webhook_url = body.webhook.trim();
  }
  return c.json(monitor, 201);
});

app.get('/api/monitors', requireAuth, async (c) => {
  const user = c.var.user;
  const monitors = d.getMonitorsByUser(user.id);
  return c.json(monitors);
});

app.post('/api/reseed', requireAuth, async (c) => {
  const user = c.var.user;
  const existing = d.getMonitorsByUser(user.id);
  for (const m of existing) {
    d.deleteMonitor(m.id, user.id);
  }
  seedDemoMonitors();
  return c.json({ ok: true, message: 'Re-seeded demo monitors' });
});

app.delete('/api/monitors/:id', requireAuth, async (c) => {
  const user = c.var.user;
  const id = parseInt(c.req.param('id') || '');
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const ok = d.deleteMonitor(id, user.id);
  if (!ok) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

app.patch('/api/monitors/:id', requireAuth, async (c) => {
  const user = c.var.user;
  const id = parseInt(c.req.param('id') || '');
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json<{ webhook?: string }>();
  if (body.webhook !== undefined) {
    const m = d.updateMonitorWebhook(id, user.id, body.webhook);
    if (!m) return c.json({ error: 'Not found' }, 404);
    return c.json(m);
  }
  return c.json({ error: 'Nothing to update' }, 400);
});

app.post('/api/monitors/:id/check', requireAuth, async (c) => {
  const user = c.var.user;
  const id = parseInt(c.req.param('id') || '');
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const monitor = d.getMonitorByIdAndUser(id, user.id);
  if (!monitor) return c.json({ error: 'Not found' }, 404);

  const startTime = Date.now();
  await checkSingleMonitor(monitor);
  const updated = d.getMonitorById(id);
  return c.json({ ok: true, status: updated?.last_status, elapsed_ms: Date.now() - startTime });
});

app.post('/api/monitors/:id/test-webhook', requireAuth, async (c) => {
  const user = c.var.user;
  const id = parseInt(c.req.param('id') || '');
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const monitor = d.getMonitorByIdAndUser(id, user.id);
  if (!monitor) return c.json({ error: 'Not found' }, 404);
  if (!monitor.webhook_url) return c.json({ error: 'No webhook configured' }, 400);

  try {
    await sendWebhookAlert(monitor, 1, 200, 42, monitor.webhook_url);
    return c.json({ ok: true, message: 'Test webhook sent' });
  } catch {
    return c.json({ error: 'Failed to send webhook' }, 502);
  }
});

app.get('/badge/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.body('Not found', 404);

  const monitor = d.getMonitorById(id);
  if (!monitor) return c.body('Not found', 404);

  const referer = c.req.header('Referer') || null;
  const ip = c.req.header('X-Forwarded-For') || c.req.header('CF-Connecting-IP') || null;
  const ua = c.req.header('User-Agent') || null;
  d.recordBadgeImpression(id, referer, ip, ua);

  const svg = generateBadge({
    label: monitor.name,
    isOnline: monitor.last_status === 'online',
    uptime: monitor.uptime_24h,
  });

  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
});

app.get('/status/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.html('<h1>Not found</h1>', 404);

  const monitor = d.getMonitorById(id);
  if (!monitor) return c.html('<h1>Not found</h1>', 404);

  const owner = d.getUserById(monitor.user_id);
  const checks = d.getRecentHealthChecks(id, 24);

  return c.html(views.statusPage(
    { ...monitor, username: owner?.username || 'unknown' },
    checks,
    getAppUrl(c)
  ));
});

app.get('/gallery', async (c) => {
  const monitors = d.getAllMonitorsWithUsers();
  const withCounts = monitors.map((m) => {
    const count = d.getBadgeImpressionCount(m.id);
    return { ...m, impression_count: count };
  });
  return c.html(views.gallery(withCounts, getAppUrl(c)));
});

const port = parseInt(process.env.PORT || '3000');

serve({ fetch: app.fetch, port });

console.log(`LiveStatus running on port ${port}`);
console.log(`ADMIN_API_KEY: ${process.env.ADMIN_API_KEY || 'dev-key-change-me'}`);

runHealthChecks().catch(console.error);
setInterval(() => runHealthChecks().catch(console.error), 5 * 60 * 1000);
console.log('Health check scheduler started (every 5 minutes)');
