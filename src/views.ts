import { Monitor, User } from './db.js';

const LAYOUT_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;background:#0d1117;color:#e6edf3;min-height:100vh;display:flex;flex-direction:column}
a{color:#58a6ff;text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:960px;margin:0 auto;padding:0 24px;width:100%}
header{border-bottom:1px solid #21262d;padding:16px 0;background:#161b22}
header .container{display:flex;align-items:center;justify-content:space-between}
header h1{font-size:20px;font-weight:700;color:#f0f6fc}
header h1 span{color:#36D399}
header nav{display:flex;align-items:center;gap:20px}
header nav a{font-size:14px;color:#8b949e}
header nav a:hover{color:#f0f6fc;text-decoration:none}
header .avatar{width:24px;height:24px;border-radius:50%}
footer{border-top:1px solid #21262d;padding:24px 0;margin-top:auto;text-align:center;color:#8b949e;font-size:13px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:6px;font-size:14px;font-weight:600;border:none;cursor:pointer;text-decoration:none;transition:background .2s}
.btn-primary{background:#238636;color:#fff}
.btn-primary:hover{background:#2ea043;text-decoration:none}
.btn-secondary{background:#21262d;color:#c9d1d9;border:1px solid #30363d}
.btn-secondary:hover{background:#30363d;text-decoration:none}
.btn-danger{background:#da3633;color:#fff}
.btn-danger:hover{background:#f85149;text-decoration:none}
.btn-ghost{background:transparent;color:#8b949e;border:1px solid #30363d}
.btn-ghost:hover{background:#21262d;text-decoration:none}
input[type=text],input[type=url]{width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e6edf3;font-size:14px;outline:none}
input:focus{border-color:#58a6ff}
.card{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:24px;margin-bottom:16px}
.card h2{font-size:18px;margin-bottom:16px}
code{background:#0d1117;padding:2px 6px;border-radius:4px;font-size:13px;color:#f0f6fc}
.monitor-item{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #21262d}
.monitor-item:last-child{border-bottom:none}
.monitor-item .info{flex:1}
.monitor-item .name{font-weight:600;font-size:15px}
.monitor-item .url{color:#8b949e;font-size:13px}
.monitor-item .status{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600}
.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.status-dot.online{background:#36D399}
.status-dot.offline{background:#FF6B6B}
.status-dot.unknown{background:#8b949e}
.status-dot.animated{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.monitor-actions{display:flex;gap:8px;align-items:center}
.empty-state{text-align:center;padding:48px 24px;color:#8b949e}
.empty-state p{font-size:15px;margin-bottom:16px}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:14px;font-weight:600;margin-bottom:6px;color:#c9d1d9}
.form-row{display:flex;gap:12px}
.form-row .form-group{flex:1}
.hero{text-align:center;padding:80px 24px 60px}
.hero h1{font-size:40px;font-weight:800;margin-bottom:16px;line-height:1.2}
.hero h1 span{color:#36D399}
.hero p{font-size:18px;color:#8b949e;max-width:600px;margin:0 auto 32px;line-height:1.6}
.hero .badge-example{margin-bottom:40px}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:0 24px 60px;max-width:960px;margin:0 auto}
.feature{text-align:center;padding:24px}
.feature .icon{font-size:32px;margin-bottom:12px}
.feature h3{font-size:16px;margin-bottom:8px}
.feature p{font-size:14px;color:#8b949e;line-height:1.5}
.uptime-bar{display:flex;gap:2px;margin-top:12px}
.uptime-bar .bar{height:16px;flex:1;border-radius:2px;min-width:4px}
.uptime-bar .bar.up{background:#36D399}
.uptime-bar .bar.down{background:#FF6B6B}
.uptime-bar .bar.empty{background:#21262d}
.copy-input{display:flex;gap:8px;align-items:center;margin-top:8px}
.copy-input input{flex:1;font-family:monospace;font-size:12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px 12px;color:#e6edf3}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.stat-card{background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:16px;text-align:center}
.stat-card .value{font-size:28px;font-weight:700}
.stat-card .label{font-size:12px;color:#8b949e;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
.gallery-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding-bottom:60px}
.gallery-card{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:20px;text-align:center}
.gallery-card .repo{font-weight:600;margin-bottom:8px}
.gallery-card .author{font-size:13px;color:#8b949e;margin-bottom:12px}
.alert{padding:12px 16px;border-radius:6px;margin-bottom:16px;font-size:14px}
.alert-error{background:#da363333;border:1px solid #da3633;color:#ffa198}
.alert-success{background:#23863633;border:1px solid #238636;color:#7ee787}
@media(max-width:768px){
  .features{grid-template-columns:1fr}
  .hero h1{font-size:28px}
  .monitor-item{flex-direction:column;align-items:flex-start;gap:12px}
  .monitor-actions{width:100%;flex-wrap:wrap}
  .gallery-grid{grid-template-columns:1fr}
  .stat-grid{grid-template-columns:1fr}
  .form-row{flex-direction:column}
}`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const views = {
  layout(title: string, content: string, user: { username: string; avatar_url?: string | null } | null): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — LiveStatus</title>
<style>${LAYOUT_CSS}</style>
</head>
<body>
<header>
<div class="container">
<a href="/" style="text-decoration:none"><h1>Live<span>Status</span></h1></a>
<nav>
<a href="/gallery">Gallery</a>
${user ? `<a href="/dashboard">Dashboard</a><a href="/auth/logout">Logout</a><span style="font-size:13px;font-weight:600;color:#8b949e">${user.username}</span>` : '<a href="/login">Sign in</a>'}
</nav>
</div>
</header>
${content}
<footer>
<div class="container">
LiveStatus — Open source uptime monitoring · <a href="/gallery">Gallery</a> · <a href="/">Home</a>
</div>
</footer>
</body>
</html>`;
  },

  landing(): string {
    const dogfoodBadges = [
      { id: 4, name: 'Auto-Company Site' },
      { id: 5, name: 'ReqDump' },
      { id: 6, name: 'SnapOG' },
    ].map(b => `<a href="/status/${b.id}" style="display:inline-block;margin:4px"><img src="/badge/${b.id}" alt="${b.name}" style="height:24px"></a>`).join('\n');

    const content = `
<div class="hero">
<div class="badge-example">
<svg xmlns="http://www.w3.org/2000/svg" width="210" height="24" viewBox="0 0 210 24">
<defs><clipPath id="r"><rect rx="4" width="210" height="24"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="130" height="24" fill="#24292e"/><rect x="130" width="80" height="24" fill="#36D399"/></g>
<circle cx="12" cy="12" r="4" fill="#36D399"><animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/></circle>
<text x="22" y="15" fill="#fff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="13" font-weight="600">My API Service</text>
<text x="200" y="15" fill="#fff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="13" font-weight="700" text-anchor="end">100.0% ONLINE</text>
</svg>
</div>
<div style="margin-bottom:32px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
${dogfoodBadges}
</div>
<h1>Uptime monitoring<br>for your <span>README</span></h1>
<p>Add a live status badge to your GitHub README. Monitor your APIs, services, and websites. Get alerted when things go down.</p>
<a href="/login" class="btn btn-primary" style="font-size:16px;padding:12px 32px">
Get Started — Sign In
</a>
</div>
<div class="features">
<div class="feature"><div class="icon">🖼️</div><h3>Live Badges</h3><p>Add a dynamic SVG badge to any README or website. Updates every 5 minutes. Shows uptime at a glance.</p></div>
<div class="feature"><div class="icon">🔔</div><h3>Instant Alerts</h3><p>Get notified via Slack or Discord when your service goes down. Never miss an outage.</p></div>
<div class="feature"><div class="icon">📊</div><h3>Status Pages</h3><p>Every monitor gets a public status page with 30-day uptime history. Share it with your users.</p></div>
<div class="feature"><div class="icon">🐙</div><h3>GitHub Ready</h3><p>Add live badges to any README. GitHub Actions integration included.</p></div>
</div>`;
    return this.layout('Uptime Monitoring with README Badges', content, null);
  },

  dashboard(user: User, monitors: Monitor[], appUrl: string): string {
    const monitorRows = monitors.length === 0
      ? `<div class="empty-state"><p>You haven't created any monitors yet.</p><a href="#" onclick="document.getElementById('name').focus()" class="btn btn-primary">Create your first monitor</a></div>`
      : monitors.map(m => {
          const sc = m.last_status === 'online' ? 'online' : m.last_status === 'offline' ? 'offline' : 'unknown';
          const badgeUrl = `${appUrl}/badge/${m.id}`;
          const statusPage = `${appUrl}/status/${m.id}`;
          const embedCode = `[![LiveStatus](${badgeUrl})](${statusPage})`;
          return `<div class="monitor-item" data-id="${m.id}">
<div class="info">
<div class="name">${esc(m.name)}</div>
<div class="url">${esc(m.url)}</div>
<div class="status" style="margin-top:4px"><span class="status-dot ${sc} animated"></span>${m.last_status.toUpperCase()} · ${m.uptime_24h.toFixed(1)}% (24h) · ${m.uptime_30d.toFixed(1)}% (30d)</div>
<div class="copy-input"><input type="text" value="${esc(embedCode)}" readonly onclick="this.select()"><button class="btn btn-secondary" onclick="copyText(this)" style="flex-shrink:0;font-size:12px;padding:6px 12px">Copy</button></div>
</div>
<div class="monitor-actions">
${m.webhook_url ? '<span style="color:#8b949e;font-size:12px" title="Webhook configured">🔔</span>' : ''}
${m.webhook_url ? `<button class="btn btn-secondary" style="font-size:12px;padding:6px 12px" onclick="testWebhook(${m.id},this)">Test</button>` : ''}
<a href="/status/${m.id}" class="btn btn-ghost" style="font-size:12px;padding:6px 12px">Status</a>
<a href="/badge/${m.id}" class="btn btn-ghost" style="font-size:12px;padding:6px 12px">Badge</a>
<button class="btn btn-danger" style="font-size:12px;padding:6px 12px" onclick="deleteMonitor(${m.id})">Delete</button>
</div>
</div>`;
        }).join('\n');

    const content = `
<div class="container" style="padding-top:24px;padding-bottom:60px">
<h2 style="font-size:22px;margin-bottom:24px">Dashboard</h2>
<div id="alert"></div>
<div class="card" id="create-form">
<h2>New Monitor</h2>
<form onsubmit="createMonitor(event)">
<div class="form-row">
<div class="form-group"><label for="name">Service Name</label><input type="text" id="name" placeholder="My API" required></div>
<div class="form-group"><label for="url">URL to Monitor</label><input type="url" id="url" placeholder="https://api.example.com/health" required></div>
</div>
<div class="form-group"><label for="webhook">Webhook URL (optional — Slack/Discord alerts)</label><input type="url" id="webhook" placeholder="https://hooks.slack.com/services/..."></div>
<button type="submit" class="btn btn-primary">Create Monitor</button>
</form>
</div>
<div class="card">
<h2>Your Monitors</h2>
<div id="monitor-list">${monitorRows}</div>
</div>
</div>
<script>
async function createMonitor(e){
e.preventDefault();
const name=document.getElementById('name').value;
const url=document.getElementById('url').value;
const webhook=document.getElementById('webhook').value;
const res=await fetch('/api/monitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,url,webhook})});
if(res.ok){location.reload()}
else{const d=await res.json();showAlert(d.error||'Failed','error')}
}
async function deleteMonitor(id){
if(!confirm('Delete this monitor? This cannot be undone.'))return;
const res=await fetch('/api/monitors/'+id,{method:'DELETE'});
if(res.ok){location.reload()}
else{showAlert('Failed to delete','error')}
}
async function testWebhook(id,btn){
btn.disabled=true;btn.textContent='Sending...'
const res=await fetch('/api/monitors/'+id+'/test-webhook',{method:'POST'});
const d=await res.json();
if(res.ok){showAlert('Test webhook sent! Check your Slack/Discord.','success')}
else{showAlert(d.error||'Failed','error')}
btn.disabled=false;btn.textContent='Test'
}
function copyText(btn){
const input=btn.parentElement.querySelector('input');
input.select();navigator.clipboard.writeText(input.value);
btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',2000)
}
function showAlert(msg,type){
const el=document.getElementById('alert');
el.innerHTML='<div class="alert alert-'+type+'">'+msg+'</div>';
setTimeout(()=>el.innerHTML='',5000)
}
</script>`;
    return this.layout('Dashboard', content, user);
  },

  statusPage(monitor: Monitor & { username: string }, checks: { checked_at: string; is_online: number }[], appUrl: string): string {
    const hourBuckets: { up: number; total: number }[] = [];
    for (let i = 0; i < 24; i++) hourBuckets[i] = { up: 0, total: 0 };
    for (const c of checks) {
      const d = new Date(c.checked_at + 'Z');
      const h = d.getUTCHours();
      if (h >= 0 && h < 24) {
        hourBuckets[h].total++;
        if (c.is_online) hourBuckets[h].up++;
      }
    }
    const bars = hourBuckets.map(b => {
      if (b.total === 0) return '<div class="bar empty"></div>';
      const pct = b.up / b.total;
      return `<div class="bar ${pct >= 0.9 ? 'up' : 'down'}" title="${Math.round(pct * 100)}% uptime"></div>`;
    }).join('');

    const badgeUrl = `${appUrl}/badge/${monitor.id}`;
    const sc = monitor.last_status === 'online' ? 'online' : monitor.last_status === 'offline' ? 'offline' : 'unknown';

    const content = `
<div class="container" style="padding-top:40px;padding-bottom:60px">
<div style="text-align:center;margin-bottom:32px">
<img src="${badgeUrl}" alt="${esc(monitor.name)} status" style="height:24px">
<h1 style="font-size:28px;margin-top:16px">${esc(monitor.name)}</h1>
<p style="color:#8b949e">${esc(monitor.url)}</p>
</div>
<div class="stat-grid">
<div class="stat-card"><div class="value" style="color:${monitor.last_status === 'online' ? '#36D399' : '#FF6B6B'}">${monitor.last_status.toUpperCase()}</div><div class="label">Current Status</div></div>
<div class="stat-card"><div class="value">${monitor.uptime_24h.toFixed(1)}%</div><div class="label">24h Uptime</div></div>
<div class="stat-card"><div class="value">${monitor.uptime_30d.toFixed(1)}%</div><div class="label">30d Uptime</div></div>
</div>
<div class="card"><h2>Last 24 Hours</h2><p style="color:#8b949e;font-size:13px;margin-bottom:8px">Green = online, Red = offline, Gray = no data</p><div class="uptime-bar">${bars}</div></div>
<div class="card"><h2>Badge</h2><p style="color:#8b949e;font-size:13px;margin-bottom:8px">Add this to your README:</p><div class="copy-input"><input type="text" value="[![LiveStatus](${esc(badgeUrl)})](${esc(appUrl)}/status/${monitor.id})" readonly onclick="this.select()"><button class="btn btn-secondary" onclick="copyText(this)" style="flex-shrink:0">Copy</button></div></div>
</div>
<script>
function copyText(btn){const input=btn.parentElement.querySelector('input');input.select();navigator.clipboard.writeText(input.value);btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',2000)}
setTimeout(()=>location.reload(),30000);
</script>`;
    return this.layout(`${monitor.name} Status`, content, null);
  },

  loginPage(): string {
    const content = `
<div class="container" style="padding-top:80px;padding-bottom:80px;max-width:420px">
<div style="text-align:center;margin-bottom:32px">
<h1 style="font-size:28px;font-weight:800">Live<span style="color:#36D399">Status</span></h1>
<p style="color:#8b949e;font-size:14px;margin-top:8px">Sign in with your admin API key</p>
</div>
<div class="card">
<form onsubmit="login(event)">
<div class="form-group">
<label for="apiKey">API Key</label>
<input type="password" id="apiKey" placeholder="Enter your admin API key" required style="font-family:monospace">
</div>
<button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Sign In</button>
</form>
<div id="error" style="display:none" class="alert alert-error" style="margin-top:16px"></div>
</div>
</div>
<script>
async function login(e){
e.preventDefault();
const key=document.getElementById('apiKey').value;
const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key})});
if(res.ok){window.location.href='/dashboard'}
else{const el=document.getElementById('error');el.style.display='block';el.textContent='Invalid API key'}
}
</script>`;
    return this.layout('Sign In', content, null);
  },

  gallery(monitors: (Monitor & { username: string; impression_count: number })[], appUrl: string): string {
    const cards = monitors.length === 0
      ? `<div class="empty-state"><p>No badges in the gallery yet. <a href="/login">Sign in</a> to create the first monitor.</p></div>`
      : monitors.map(m => {
          const badgeUrl = `${appUrl}/badge/${m.id}`;
          return `<div class="gallery-card"><div class="repo"><a href="/status/${m.id}">${esc(m.name)}</a></div><div class="author">by ${esc(m.username)} · ${m.impression_count} views</div><a href="/status/${m.id}"><img src="${badgeUrl}" alt="${esc(m.name)} status" style="height:24px"></a></div>`;
        }).join('\n');

    const content = `
<div class="container" style="padding-top:24px;padding-bottom:60px">
<h2 style="font-size:22px;margin-bottom:8px">Badge Gallery</h2>
<p style="color:#8b949e;font-size:14px;margin-bottom:24px">Projects using LiveStatus badges to show their uptime.</p>
<div class="gallery-grid">${cards}</div>
</div>`;
    return this.layout('Gallery', content, null);
  },
};
