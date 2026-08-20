// functions/_middleware.js
// Runs before every request served by Cloudflare Pages. Protects the admin
// UI and the write/read API behind the session cookie. /admin/login.html
// and POST /api/auth/login stay public (you need to reach them to log in).

import { isRequestAuthed } from "./_lib/auth.js";

// Cloudflare Pages serves *.html files at their extensionless URL and
// 308-redirects the .html request there — so the canonical path is
// "/admin/login", not "/admin/login.html". Allow both forms defensively.
const PUBLIC_PATHS = new Set(["/admin/login", "/admin/login.html", "/api/auth/login"]);

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const { pathname } = url;

  const isAdminPage = pathname.startsWith("/admin/");
  const isApi = pathname.startsWith("/api/");

  if (!isAdminPage && !isApi) {
    return next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return next();
  }

  // Public read-only API used by nothing external today, but categories are
  // safe to expose without auth if you later want a public API. For now
  // everything under /api/ requires a session, same as /admin/.
  const authed = await isRequestAuthed(request, env);

  if (!authed) {
    if (isApi) {
      return new Response(JSON.stringify({ error: "अनधिकृत" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return Response.redirect(`${url.origin}/admin/login`, 302);
  }

  return next();
}
