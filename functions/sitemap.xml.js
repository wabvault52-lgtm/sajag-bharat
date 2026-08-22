// functions/sitemap.xml.js — GET /sitemap.xml
import { listArticles, listCategories } from "./_lib/db.js";
import { renderSitemapXml } from "./_lib/render.js";
import { siteMeta } from "./_lib/site-config.js";

export async function onRequestGet({ env }) {
  const [articles, categories] = await Promise.all([
    listArticles(env, { onlyPublished: true }),
    listCategories(env)
  ]);
  return new Response(renderSitemapXml({ articles, categories, siteMeta }), {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
