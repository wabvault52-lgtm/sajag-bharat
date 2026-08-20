// functions/_lib/auth.js
// Single-admin auth. Zero external dependencies — password hashing uses
// PBKDF2 via the built-in Web Crypto API (crypto.subtle), which is native
// to BOTH the Cloudflare Workers runtime and modern Node.js. That means
// this exact file works unmodified locally (scripts/hash-password.js) and
// live (the Function) with nothing to npm-install, so a Cloudflare Pages
// deploy with an empty build command can never fail to resolve it.
// The session is a small HMAC-signed token in an httpOnly cookie, also
// signed with Web Crypto — no JWT library needed either.

const COOKIE_NAME = "sb_session";
const SESSION_HOURS = 12;
const PBKDF2_ITERATIONS = 100000;

function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function pbkdf2(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

/** Used by scripts/hash-password.js to produce ADMIN_PASSWORD_HASH. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(hash)}`;
}

export async function verifyPassword(plain, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromHex(parts[2]);
  const expectedHex = parts[3];
  const actualHex = toHex(await pbkdf2(plain, salt, iterations));
  return constantTimeEqual(actualHex, expectedHex);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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
