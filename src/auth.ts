import { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import { db, User } from './db';

export interface AuthEnv {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  APP_URL: string;
}

function getJwtSecret(env: AuthEnv): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function createSessionToken(user: User, env: AuthEnv): Promise<string> {
  return new SignJWT({ sub: String(user.id), username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret(env));
}

export async function verifySessionToken(token: string, env: AuthEnv): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(env));
    if (!payload.sub) return null;
    return { userId: parseInt(payload.sub as string), username: (payload.username as string) || '' };
  } catch {
    return null;
  }
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, 'session', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,
    maxAge: 604800,
    path: '/',
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, 'session', { path: '/' });
}

export async function getSessionUser(c: Context): Promise<User | null> {
  const token = getCookie(c, 'session');
  if (!token) return null;
  const payload = await verifySessionToken(token, c.env as unknown as AuthEnv);
  if (!payload) return null;
  const user = await db((c.env as unknown as AuthEnv).DB).getUserById(payload.userId);
  return user;
}

export async function handleGitHubCallback(code: string, env: AuthEnv): Promise<User | null> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!tokenRes.ok) return null;
  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) return null;

  const userRes = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return null;
  const githubUser = await userRes.json() as {
    id: number; login: string; avatar_url: string;
  };

  const d = db(env.DB);
  return d.upsertUser(githubUser.id, githubUser.login, githubUser.avatar_url);
}

export function getGitHubAuthUrl(env: AuthEnv): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/auth/callback`,
    scope: 'read:user',
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}
