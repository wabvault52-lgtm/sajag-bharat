// functions/[[catchall]].js — matches any path no more specific Function
// claims. Two responsibilities, in order:
//   1. Defensive homepage handling — some routers resolve "/" here instead
//      of functions/index.js; render the real homepage rather than 404ing.
//   2. Let real static assets (CSS/JS/images, /admin/*.html) win via
//      env.ASSETS — Pages' built-in static-asset fetcher — before ever
//      falling back to our custom 404 page.
import { listCategories, listArticles } from "./_lib/db.js";
import { renderNotFoundPage, renderIndexPage } from "./_lib/render.js";
import { siteMeta } from "./_lib/site-config.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    const [articles, categories] = await Promise.all([
      listArticles(env, { onlyPublished: true }),
      listCategories(env)
    ]);
    return new Response(renderIndexPage({ articles, categories, siteMeta }), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) return assetResponse;

  const categories = await listCategories(env);
  return new Response(renderNotFoundPage({ categories, siteMeta }), {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
