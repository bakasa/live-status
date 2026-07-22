import { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';
import { db, User } from './db.js';

function getAdminApiKey(): string {
  return process.env.ADMIN_API_KEY || 'dev-key-change-me';
}

function getJwtSecret(): Uint8Array {
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    secret = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    process.env.JWT_SECRET = secret;
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: number, username: string): Promise<string> {
  return new SignJWT({ sub: String(userId), username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

async function verifySessionToken(token: string): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
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
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return db().getUserById(payload.userId) ?? null;
}

export function getAdminUser(): User {
  const d = db();
  let user = d.getUserByUsername('admin');
  if (!user) {
    user = d.upsertUser('admin');
  }
  return user;
}

export function validateApiKey(key: string): boolean {
  return key === getAdminApiKey();
}

export async function authenticateRequest(c: Context): Promise<User | null> {
  const sessionUser = await getSessionUser(c);
  if (sessionUser) return sessionUser;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7);
    if (validateApiKey(key)) {
      return getAdminUser();
    }
  }

  return null;
}
