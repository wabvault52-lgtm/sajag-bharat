// functions/_lib/auth.js
// Single-admin auth. Password is checked with bcryptjs (pure JS, works in
// the Workers runtime). The session is a small HMAC-signed token stored in
// an httpOnly cookie — signed with Web Crypto (SubtleCrypto), which IS
// available in Cloudflare Workers, so no JWT library is needed.

import bcrypt from "bcryptjs";

const COOKIE_NAME = "sb_session";
const SESSION_HOURS = 12;

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(secret, payload) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bufferToBase64Url(sig);
}

function bufferToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionCookie(env) {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = `admin.${expires}`;
  const sig = await sign(env.SESSION_SECRET, payload);
  const token = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function isRequestAuthed(request, env) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const token = match[1];
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, expires, sig] = parts;
  if (Date.now() > Number(expires)) return false;
  const expectedSig = await sign(env.SESSION_SECRET, `${who}.${expires}`);
  return expectedSig === sig;
}
