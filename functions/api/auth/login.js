// functions/api/auth/login.js
import { verifyPassword, createSessionCookie } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "अमान्य अनुरोध" }, 400);
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return json({ error: "यूज़रनेम और पासवर्ड दोनों आवश्यक हैं" }, 400);
  }

  if (username !== env.ADMIN_USERNAME) {
    return json({ error: "यूज़रनेम या पासवर्ड ग़लत है" }, 401);
  }

  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    return json({ error: "यूज़रनेम या पासवर्ड ग़लत है" }, 401);
  }

  const cookie = await createSessionCookie(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie }
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
