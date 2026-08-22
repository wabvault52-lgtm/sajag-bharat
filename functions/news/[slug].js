// functions/news/[slug].js — GET /news/:slug
import { getArticleBySlug, listArticles, listCategories } from "../_lib/db.js";
import { renderArticlePage, renderNotFoundPage } from "../_lib/render.js";
import { siteMeta } from "../_lib/site-config.js";

export async function onRequestGet({ env, params }) {
  const [article, categories] = await Promise.all([
    getArticleBySlug(env, params.slug),
    listCategories(env)
  ]);

  if (!article || article.status !== "published") {
    return new Response(renderNotFoundPage({ categories, siteMeta }), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const allArticles = await listArticles(env, { onlyPublished: true });
  return new Response(renderArticlePage({ article, categories, allArticles, siteMeta }), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
