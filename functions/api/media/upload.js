// functions/api/media/upload.js
import { commitFiles } from "../../_lib/github.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "अमान्य अनुरोध" }, 400);
  }

  const { filename, contentType, base64 } = body || {};
  if (!filename || !contentType || !base64) {
    return json({ error: "filename, contentType और base64 आवश्यक हैं" }, 400);
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    return json({ error: "केवल JPEG, PNG, WebP या GIF तस्वीरें मान्य हैं" }, 400);
  }
  if (base64.length * 0.75 > MAX_BYTES) {
    return json({ error: "तस्वीर 5MB से बड़ी नहीं होनी चाहिए" }, 400);
  }

  const ext = filename.split(".").pop().toLowerCase();
  const safeName = `${Date.now()}-${filename.toLowerCase().replace(/[^a-z0-9.\-]/g, "-")}`;
  const path = `public/assets/images/${safeName}`;

  try {
    await commitFiles(env, {
      message: `तस्वीर अपलोड: ${safeName}`,
      files: [{ path, content: base64, encoding: "base64" }]
    });
  } catch (err) {
    return json({ error: "GitHub पर अपलोड करने में विफल: " + err.message }, 502);
  }

  return json({ url: `/assets/images/${safeName}` });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
