// scripts/hash-password.js
// Usage: node scripts/hash-password.js "your-password-here"
// Prints a PBKDF2 hash (via Web Crypto — no dependency to install) — paste
// it as the ADMIN_PASSWORD_HASH secret in Cloudflare Pages
// (Settings → Environment variables).

import { hashPassword } from "../functions/_lib/auth.js";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js \"your-password\"");
  process.exit(1);
}

const hash = await hashPassword(password);
console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
console.log("इसे Cloudflare Pages → Settings → Environment variables में ADMIN_PASSWORD_HASH (secret) के तौर पर सेव करें।\n");
