import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  _db = new Database(path.join(dir, 'livestatus.db'));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      webhook_url TEXT,
      last_status TEXT DEFAULT 'unknown' NOT NULL,
      uptime_24h REAL DEFAULT 100.0,
      uptime_30d REAL DEFAULT 100.0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS health_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      is_online INTEGER NOT NULL DEFAULT 0,
      checked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (monitor_id) REFERENCES monitors(id)
    );

    CREATE TABLE IF NOT EXISTS badge_impressions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER NOT NULL,
      referer TEXT,
      ip TEXT,
      user_agent TEXT,
      clicked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (monitor_id) REFERENCES monitors(id)
    );

    CREATE INDEX IF NOT EXISTS idx_health_checks_monitor_id ON health_checks(monitor_id);
    CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON health_checks(checked_at);
    CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
    CREATE INDEX IF NOT EXISTS idx_badge_impressions_monitor_id ON badge_impressions(monitor_id);
  `);
}

export interface User {
  id: number;
  username: string;
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

export function db() {
  const d = getDb();

  function upsertUser(username: string): User {
    const existing = d.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    if (existing) return existing;
    const stmt = d.prepare('INSERT INTO users (username) VALUES (?)');
    const info = stmt.run(username);
    return { id: info.lastInsertRowid as number, username, created_at: new Date().toISOString() };
  }

  function getUserByUsername(username: string): User | undefined {
    return d.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  }

  function getUserById(id: number): User | undefined {
    return d.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  function createMonitor(userId: number, name: string, url: string): Monitor {
    const stmt = d.prepare('INSERT INTO monitors (user_id, name, url) VALUES (?, ?, ?)');
    const info = stmt.run(userId, name, url);
    return d.prepare('SELECT * FROM monitors WHERE id = ?').get(info.lastInsertRowid) as Monitor;
  }

  function getMonitorsByUser(userId: number): Monitor[] {
    return d.prepare('SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Monitor[];
  }

  function getMonitorById(id: number): Monitor | undefined {
    return d.prepare('SELECT * FROM monitors WHERE id = ?').get(id) as Monitor | undefined;
  }

  function getMonitorByIdAndUser(id: number, userId: number): Monitor | undefined {
    return d.prepare('SELECT * FROM monitors WHERE id = ? AND user_id = ?').get(id, userId) as Monitor | undefined;
  }

  function deleteMonitor(id: number, userId: number): boolean {
    d.prepare('DELETE FROM health_checks WHERE monitor_id = ?').run(id);
    d.prepare('DELETE FROM badge_impressions WHERE monitor_id = ?').run(id);
    const info = d.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?').run(id, userId);
    return info.changes > 0;
  }

  function updateMonitorWebhook(id: number, userId: number, webhookUrl: string): Monitor | undefined {
    d.prepare("UPDATE monitors SET webhook_url = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(webhookUrl, id, userId);
    return getMonitorByIdAndUser(id, userId);
  }

  function getAllMonitors(): Monitor[] {
    return d.prepare('SELECT * FROM monitors').all() as Monitor[];
  }

  function recordHealthCheck(monitorId: number, statusCode: number | null, responseTimeMs: number | null, isOnline: number): void {
    d.prepare('INSERT INTO health_checks (monitor_id, status_code, response_time_ms, is_online) VALUES (?, ?, ?, ?)').run(monitorId, statusCode, responseTimeMs, isOnline);
  }

  function getRecentHealthChecks(monitorId: number, hours: number): HealthCheck[] {
    return d.prepare("SELECT * FROM health_checks WHERE monitor_id = ? AND checked_at > datetime('now', '-' || ? || ' hours') ORDER BY checked_at ASC").all(monitorId, hours) as HealthCheck[];
  }

  function updateMonitorStatus(id: number, status: string): void {
    d.prepare("UPDATE monitors SET last_status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  }

  function calculateUptime(monitorId: number, hours: number): number {
    const row = d.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online_count FROM health_checks WHERE monitor_id = ? AND checked_at > datetime('now', '-' || ? || ' hours')").get(monitorId, hours) as { total: number; online_count: number | null };
    if (!row || row.total === 0) return 100.0;
    return Math.round(((row.online_count ?? 0) / row.total) * 1000) / 10;
  }

  function updateMonitorUptime(id: number, uptime24h: number, uptime30d: number): void {
    d.prepare('UPDATE monitors SET uptime_24h = ?, uptime_30d = ? WHERE id = ?').run(uptime24h, uptime30d, id);
  }

  function recordBadgeImpression(monitorId: number, referer: string | null, ip: string | null, userAgent: string | null): void {
    d.prepare('INSERT INTO badge_impressions (monitor_id, referer, ip, user_agent) VALUES (?, ?, ?, ?)').run(monitorId, referer, ip, userAgent);
  }

  function getBadgeImpressionCount(monitorId: number): number {
    const row = d.prepare('SELECT COUNT(*) as count FROM badge_impressions WHERE monitor_id = ?').get(monitorId) as { count: number };
    return row?.count ?? 0;
  }

  function getAllMonitorsWithUsers(): (Monitor & { username: string })[] {
    return d.prepare('SELECT m.*, u.username FROM monitors m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC').all() as (Monitor & { username: string })[];
  }

  return {
    upsertUser, getUserByUsername, getUserById,
    createMonitor, getMonitorsByUser, getMonitorById, getMonitorByIdAndUser,
    deleteMonitor, updateMonitorWebhook,
    getAllMonitors, recordHealthCheck, getRecentHealthChecks,
    updateMonitorStatus, calculateUptime, updateMonitorUptime,
    recordBadgeImpression, getBadgeImpressionCount,
    getAllMonitorsWithUsers,
  };
}
