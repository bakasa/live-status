export interface User {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Monitor {
  id: number;
  user_id: number;
  name: string;
  url: string;
  webhook_url: string | null;
  last_status: string;
  uptime_24h: number;
  uptime_30d: number;
  created_at: string;
  updated_at: string;
}

export interface HealthCheck {
  id: number;
  monitor_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  is_online: number;
  checked_at: string;
}

export function db(db: D1Database) {
  async function upsertUser(githubId: number, username: string, avatarUrl: string | null): Promise<User> {
    const existing = await db.prepare(
      'SELECT * FROM users WHERE github_id = ?'
    ).bind(githubId).first<User>();
    if (existing) {
      await db.prepare(
        'UPDATE users SET username = ?, avatar_url = ? WHERE github_id = ?'
      ).bind(username, avatarUrl, githubId).run();
      return { ...existing, username, avatar_url: avatarUrl };
    }
    const res = await db.prepare(
      'INSERT INTO users (github_id, username, avatar_url) VALUES (?, ?, ?) RETURNING *'
    ).bind(githubId, username, avatarUrl).first<User>();
    return res!;
  }

  async function getUserById(id: number): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  }

  async function createMonitor(userId: number, name: string, url: string): Promise<Monitor> {
    const res = await db.prepare(
      'INSERT INTO monitors (user_id, name, url) VALUES (?, ?, ?) RETURNING *'
    ).bind(userId, name, url).first<Monitor>();
    return res!;
  }

  async function getMonitorsByUser(userId: number): Promise<Monitor[]> {
    const res = await db.prepare(
      'SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<Monitor>();
    return res.results;
  }

  async function getMonitorById(id: number): Promise<Monitor | null> {
    return db.prepare('SELECT * FROM monitors WHERE id = ?').bind(id).first<Monitor>();
  }

  async function getMonitorByIdAndUser(id: number, userId: number): Promise<Monitor | null> {
    return db.prepare(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first<Monitor>();
  }

  async function deleteMonitor(id: number, userId: number): Promise<boolean> {
    await db.prepare('DELETE FROM health_checks WHERE monitor_id = ?').bind(id).run();
    await db.prepare('DELETE FROM badge_impressions WHERE monitor_id = ?').bind(id).run();
    const res = await db.prepare(
      'DELETE FROM monitors WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run();
    return res.meta.changes > 0;
  }

  async function updateMonitorWebhook(id: number, userId: number, webhookUrl: string): Promise<Monitor | null> {
    const res = await db.prepare(
      "UPDATE monitors SET webhook_url = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ? RETURNING *"
    ).bind(webhookUrl, id, userId).first<Monitor>();
    return res;
  }

  async function getAllMonitors(): Promise<Monitor[]> {
    const res = await db.prepare(
      'SELECT * FROM monitors'
    ).all<Monitor>();
    return res.results;
  }

  async function recordHealthCheck(
    monitorId: number, statusCode: number | null,
    responseTimeMs: number | null, isOnline: number
  ): Promise<void> {
    await db.prepare(
      'INSERT INTO health_checks (monitor_id, status_code, response_time_ms, is_online) VALUES (?, ?, ?, ?)'
    ).bind(monitorId, statusCode, responseTimeMs, isOnline).run();
  }

  async function getRecentHealthChecks(monitorId: number, hours: number): Promise<HealthCheck[]> {
    const res = await db.prepare(
      "SELECT * FROM health_checks WHERE monitor_id = ? AND checked_at > datetime('now', '-" + hours + " hours') ORDER BY checked_at ASC"
    ).bind(monitorId).all<HealthCheck>();
    return res.results;
  }

  async function updateMonitorStatus(id: number, status: string): Promise<void> {
    await db.prepare(
      "UPDATE monitors SET last_status = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(status, id).run();
  }

  async function calculateUptime(monitorId: number, hours: number): Promise<number> {
    const res = await db.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online_count FROM health_checks WHERE monitor_id = ? AND checked_at > datetime('now', '-" + hours + " hours')"
    ).bind(monitorId).first<{ total: number; online_count: number }>();
    if (!res || res.total === 0) return 100.0;
    return Math.round((res.online_count / res.total) * 1000) / 10;
  }

  async function updateMonitorUptime(id: number, uptime24h: number, uptime30d: number): Promise<void> {
    await db.prepare(
      'UPDATE monitors SET uptime_24h = ?, uptime_30d = ? WHERE id = ?'
    ).bind(uptime24h, uptime30d, id).run();
  }

  async function recordBadgeImpression(monitorId: number, referer: string | null, ip: string | null, userAgent: string | null): Promise<void> {
    await db.prepare(
      'INSERT INTO badge_impressions (monitor_id, referer, ip, user_agent) VALUES (?, ?, ?, ?)'
    ).bind(monitorId, referer, ip, userAgent).run();
  }

  async function getBadgeImpressionCount(monitorId: number): Promise<number> {
    const res = await db.prepare(
      'SELECT COUNT(*) as count FROM badge_impressions WHERE monitor_id = ?'
    ).bind(monitorId).first<{ count: number }>();
    return res?.count ?? 0;
  }

  async function getAllMonitorsWithUsers(): Promise<(Monitor & { username: string })[]> {
    const res = await db.prepare(
      'SELECT m.*, u.username FROM monitors m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC'
    ).all<Monitor & { username: string }>();
    return res.results;
  }

  return {
    upsertUser, getUserById,
    createMonitor, getMonitorsByUser, getMonitorById, getMonitorByIdAndUser,
    deleteMonitor, updateMonitorWebhook,
    getAllMonitors, recordHealthCheck, getRecentHealthChecks,
    updateMonitorStatus, calculateUptime, updateMonitorUptime,
    recordBadgeImpression, getBadgeImpressionCount,
    getAllMonitorsWithUsers,
  };
}
