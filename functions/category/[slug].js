// functions/category/[slug].js — GET /category/:slug
import { listArticlesByCategory, listCategories } from "../_lib/db.js";
import { renderCategoryPage, renderNotFoundPage } from "../_lib/render.js";
import { siteMeta } from "../_lib/site-config.js";

export async function onRequestGet({ env, params }) {
  const categories = await listCategories(env);
  const category = categories.find((c) => c.slug === params.slug);

  if (!category) {
    return new Response(renderNotFoundPage({ categories, siteMeta }), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  const articles = await listArticlesByCategory(env, category.slug);
  return new Response(renderCategoryPage({ category, articles, categories, siteMeta }), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
