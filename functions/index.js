// functions/index.js — GET /
import { listArticles, listCategories } from "./_lib/db.js";
import { renderIndexPage } from "./_lib/render.js";
import { siteMeta } from "./_lib/site-config.js";

export async function onRequestGet({ env }) {
  const [articles, categories] = await Promise.all([
    listArticles(env, { onlyPublished: true }),
    listCategories(env)
  ]);
  return new Response(renderIndexPage({ articles, categories, siteMeta }), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
