const ONLINE_COLOR = '#36D399';
const OFFLINE_COLOR = '#FF6B6B';
const LABEL_BG = '#24292e';
const TEXT_COLOR = '#ffffff';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function measureText(s: string, fontSize: number): number {
  return s.length * fontSize * 0.6;
}

export function generateBadge(options: {
  label: string;
  isOnline: boolean;
  uptime: number;
  width?: number;
  height?: number;
}): string {
  const { label, isOnline, uptime } = options;
  const height = options.height ?? 24;
  const fontSize = 13;
  const statusColor = isOnline ? ONLINE_COLOR : OFFLINE_COLOR;
  const statusText = isOnline ? 'ONLINE' : 'OFFLINE';
  const uptimeStr = isOnline ? `${uptime.toFixed(1)}%` : '';

  const labelWidth = Math.ceil(measureText(label, fontSize)) + 28;
  const statusWidth = uptimeStr
    ? Math.ceil(measureText(`${uptimeStr} ${statusText}`, fontSize)) + 20
    : Math.ceil(measureText(statusText, fontSize)) + 20;
  const totalWidth = labelWidth + statusWidth;

  const labelTextX = 22;
  const labelTextY = Math.ceil(height / 2) + 5;
  const dotCx = 12;
  const dotCy = Math.ceil(height / 2);

  const statusTextX = totalWidth - 10;
  const statusTextY = labelTextY;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="${escapeXml(label)}: ${statusText}">
  <defs>
    <clipPath id="r">
      <rect rx="4" width="${totalWidth}" height="${height}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${LABEL_BG}"/>
    <rect x="${labelWidth}" width="${statusWidth}" height="${height}" fill="${statusColor}"/>
  </g>
  <circle cx="${dotCx}" cy="${dotCy}" r="4" fill="${statusColor}">
    <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="${labelTextX}" y="${labelTextY}" fill="${TEXT_COLOR}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="600">${escapeXml(label)}</text>
  <text x="${statusTextX}" y="${statusTextY}" fill="${TEXT_COLOR}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="end">${uptimeStr ? `${escapeXml(uptimeStr)} ${statusText}` : statusText}</text>
</svg>`;
}
