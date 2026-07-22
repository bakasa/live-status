import { db, Monitor } from './db';

interface Env {
  DB: D1Database;
}

export async function runHealthChecks(env: Env): Promise<void> {
  const d = db(env.DB);
  const monitors = await d.getAllMonitors();
  if (monitors.length === 0) return;

  await Promise.allSettled(monitors.map(m => checkSingleMonitor(m, env)));
}

async function checkSingleMonitor(monitor: Monitor, env: Env): Promise<void> {
  const d = db(env.DB);
  const startTime = Date.now();
  let statusCode: number | null = null;
  let isOnline = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(monitor.url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'LiveStatus/1.0' },
    });
    clearTimeout(timeout);
    statusCode = res.status;
    isOnline = res.status >= 200 && res.status < 500 ? 1 : 0;
  } catch {
    isOnline = 0;
  }

  const responseTimeMs = Date.now() - startTime;
  await d.recordHealthCheck(monitor.id, statusCode, responseTimeMs, isOnline);

  const newStatus = isOnline ? 'online' : 'offline';

  if (newStatus !== monitor.last_status && monitor.last_status !== 'unknown') {
    if (monitor.webhook_url) {
      await sendWebhookAlert(monitor, isOnline, statusCode, responseTimeMs, monitor.webhook_url);
    }
  }

  await d.updateMonitorStatus(monitor.id, newStatus);

  const uptime24h = await d.calculateUptime(monitor.id, 24);
  const uptime30d = await d.calculateUptime(monitor.id, 720);
  await d.updateMonitorUptime(monitor.id, uptime24h, uptime30d);
}

async function sendWebhookAlert(
  monitor: Monitor, isOnline: number,
  statusCode: number | null, responseTimeMs: number,
  webhookUrl: string
): Promise<void> {
  const statusText = isOnline ? 'ONLINE' : 'OFFLINE';
  const emoji = isOnline ? '✅' : '🔴';
  const prev = isOnline ? 'was offline' : 'was online';
  const timestamp = new Date().toISOString();

  let payload: unknown;

  if (webhookUrl.includes('discord')) {
    payload = {
      embeds: [{
        title: `${emoji} Monitor: ${monitor.name}`,
        description: `Status changed to **${statusText}** (${prev})`,
        color: isOnline ? 5620992 : 16722476,
        fields: [
          { name: 'URL', value: monitor.url, inline: true },
          { name: 'Status Code', value: String(statusCode ?? 'N/A'), inline: true },
          { name: 'Response Time', value: `${responseTimeMs}ms`, inline: true },
        ],
        timestamp,
      }],
    };
  } else if (webhookUrl.includes('slack') || webhookUrl.includes('hooks.slack')) {
    payload = {
      text: `${emoji} *${monitor.name}* is now *${statusText}*`,
      attachments: [{
        color: isOnline ? '#36D399' : '#FF6B6B',
        fields: [
          { title: 'URL', value: monitor.url, short: true },
          { title: 'Status Code', value: String(statusCode ?? 'N/A'), short: true },
          { title: 'Response Time', value: `${responseTimeMs}ms`, short: true },
        ],
        ts: Math.floor(Date.now() / 1000),
      }],
    };
  } else {
    payload = {
      text: `${emoji} ${monitor.name} is now ${statusText}`,
      status: statusText.toLowerCase(),
      url: monitor.url,
      statusCode,
      responseTimeMs,
      timestamp,
    };
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
  }
}
