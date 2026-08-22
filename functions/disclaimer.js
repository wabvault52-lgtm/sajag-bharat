// functions/disclaimer.js — GET /disclaimer
import { listCategories } from "./_lib/db.js";
import { renderStaticPage } from "./_lib/render.js";
import { siteMeta } from "./_lib/site-config.js";
import { STATIC_PAGES } from "./_lib/static-pages.js";

export async function onRequestGet({ env }) {
  const categories = await listCategories(env);
  const page = STATIC_PAGES["disclaimer"];
  return new Response(
    renderStaticPage({ ...page, categories, siteMeta }),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
