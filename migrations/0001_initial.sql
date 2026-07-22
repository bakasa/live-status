CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
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
