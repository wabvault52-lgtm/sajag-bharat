// functions/rss.xml.js — GET /rss.xml
import { listArticles } from "./_lib/db.js";
import { renderRssXml } from "./_lib/render.js";
import { siteMeta } from "./_lib/site-config.js";

export async function onRequestGet({ env }) {
  const articles = await listArticles(env, { onlyPublished: true });
  return new Response(renderRssXml({ articles, siteMeta }), {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
