// scripts/hash-password.js
// Usage: node scripts/hash-password.js "your-password-here"
// Prints a bcrypt hash — paste it as the ADMIN_PASSWORD_HASH secret in
// Cloudflare Pages (Settings → Environment variables).

import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js \"your-password\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
console.log("इसे Cloudflare Pages → Settings → Environment variables में ADMIN_PASSWORD_HASH (secret) के तौर पर सेव करें।\n");
