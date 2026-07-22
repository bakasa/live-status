import { Hono, Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { db, Monitor } from './db';
import * as auth from './auth';
import { generateBadge } from './badge';
import { runHealthChecks } from './monitor';
import { views } from './views';

type Bindings = {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  APP_URL: string;
};

type Variables = {
  user: import('./db').User;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors());

function getAppUrl(c: Context): string {
  return c.env.APP_URL || `${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`;
}

async function requireAuth(c: Context, next: Next) {
  const user = await auth.getSessionUser(c);
  if (!user) {
    if (c.req.header('Accept')?.includes('text/html')) {
      return c.redirect('/auth/github');
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

app.get('/auth/github', async (c) => {
  const url = auth.getGitHubAuthUrl(c.env as unknown as auth.AuthEnv);
  return c.redirect(url);
});

app.get('/auth/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.redirect('/');
  const user = await auth.handleGitHubCallback(code, c.env as unknown as auth.AuthEnv);
  if (!user) return c.redirect('/');
  const token = await auth.createSessionToken(user, c.env as unknown as auth.AuthEnv);
  auth.setSessionCookie(c, token);
  return c.redirect('/dashboard');
});

app.get('/auth/logout', async (c) => {
  auth.clearSessionCookie(c);
  return c.redirect('/');
});

app.get('/dashboard', requireAuth, async (c) => {
  const user = c.var.user;
  const d = db(c.env.DB);
  const monitors = await d.getMonitorsByUser(user.id);
  return c.html(views.dashboard(user, monitors, getAppUrl(c)));
});

app.post('/api/monitors', requireAuth, async (c) => {
  const user = c.var.user;
  const body = await c.req.json<{ name: string; url: string; webhook?: string }>();
  if (!body.name || !body.url) {
    return c.json({ error: 'Name and URL are required' }, 400);
  }
  try { new URL(body.url); } catch { return c.json({ error: 'Invalid URL' }, 400); }

  const d = db(c.env.DB);
  const monitors = await d.getMonitorsByUser(user.id);
  if (monitors.length >= 3) {
    return c.json({ error: 'Free tier limit: 3 monitors. Delete one first.' }, 403);
  }

  const monitor = await d.createMonitor(user.id, body.name.trim(), body.url.trim());
  if (body.webhook) {
    await d.updateMonitorWebhook(monitor.id, user.id, body.webhook.trim());
  }
  return c.json(monitor, 201);
});

app.get('/api/monitors', requireAuth, async (c) => {
  const user = c.var.user;
  const d = db(c.env.DB);
  const monitors = await d.getMonitorsByUser(user.id);
  return c.json(monitors);
});

app.delete('/api/monitors/:id', requireAuth, async (c) => {
  const user = c.var.user;
  const id = parseInt(c.req.param('id') || '');
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const d = db(c.env.DB);
  const ok = await d.deleteMonitor(id, user.id);
  if (!ok) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

app.patch('/api/monitors/:id', requireAuth, async (c) => {
  const user = c.var.user;
  const id = parseInt(c.req.param('id') || '');
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);
  const body = await c.req.json<{ webhook?: string }>();
  const d = db(c.env.DB);
  if (body.webhook !== undefined) {
    const m = await d.updateMonitorWebhook(id, user.id, body.webhook);
    if (!m) return c.json({ error: 'Not found' }, 404);
    return c.json(m);
  }
  return c.json({ error: 'Nothing to update' }, 400);
});

app.get('/badge/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.body('Not found', 404);

  const d = db(c.env.DB);
  const monitor = await d.getMonitorById(id);
  if (!monitor) return c.body('Not found', 404);

  const referer = c.req.header('Referer') || null;
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null;
  const ua = c.req.header('User-Agent') || null;
  await d.recordBadgeImpression(id, referer, ip, ua);

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

  const d = db(c.env.DB);
  const monitor = await d.getMonitorById(id);
  if (!monitor) return c.html('<h1>Not found</h1>', 404);

  const owner = await d.getUserById(monitor.user_id);
  const checks = await d.getRecentHealthChecks(id, 24);

  return c.html(views.statusPage(
    { ...monitor, username: owner?.username || 'unknown' },
    checks,
    getAppUrl(c)
  ));
});

app.get('/gallery', async (c) => {
  const d = db(c.env.DB);
  const monitors = await d.getAllMonitorsWithUsers();
  const withCounts = await Promise.all(monitors.map(async (m) => {
    const count = await d.getBadgeImpressionCount(m.id);
    return { ...m, impression_count: count };
  }));
  return c.html(views.gallery(withCounts, getAppUrl(c)));
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(runHealthChecks(env));
  },
};
