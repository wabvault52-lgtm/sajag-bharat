// functions/_lib/db.js
// All D1 (Cloudflare's SQL database) access goes through here. Row shapes
// are mapped to the same camelCase object shape the render functions
// already expect, so functions/_lib/render.js needed zero changes.

function rowToArticle(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    featuredImage: row.featured_image,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    ogImage: row.og_image
  };
}

export async function listCategories(env) {
  const { results } = await env.DB.prepare(
    "SELECT slug, name, color FROM categories ORDER BY sort_order ASC"
  ).all();
  return results;
}

export async function listArticles(env, { onlyPublished = false } = {}) {
  const query = onlyPublished
    ? "SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC"
    : "SELECT * FROM articles ORDER BY published_at DESC";
  const { results } = await env.DB.prepare(query).all();
  return results.map(rowToArticle);
}

export async function listArticlesByCategory(env, categorySlug) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM articles WHERE category = ? AND status = 'published' ORDER BY published_at DESC"
  ).bind(categorySlug).all();
  return results.map(rowToArticle);
}

export async function getArticleBySlug(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM articles WHERE slug = ?").bind(slug).first();
  return row ? rowToArticle(row) : null;
}

export async function getArticleById(env, id) {
  const row = await env.DB.prepare("SELECT * FROM articles WHERE id = ?").bind(id).first();
  return row ? rowToArticle(row) : null;
}

export async function slugTaken(env, slug, excludeId = null) {
  const row = excludeId
    ? await env.DB.prepare("SELECT id FROM articles WHERE slug = ? AND id != ?").bind(slug, excludeId).first()
    : await env.DB.prepare("SELECT id FROM articles WHERE slug = ?").bind(slug).first();
  return !!row;
}

export async function createArticle(env, a) {
  await env.DB.prepare(
    `INSERT INTO articles
     (id, title, slug, category, excerpt, content_html, featured_image, status, published_at, updated_at, meta_title, meta_description, og_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    a.id, a.title, a.slug, a.category, a.excerpt, a.contentHtml, a.featuredImage,
    a.status, a.publishedAt, a.updatedAt, a.metaTitle, a.metaDescription, a.ogImage
  ).run();
}

export async function updateArticle(env, id, a) {
  await env.DB.prepare(
    `UPDATE articles SET
       title = ?, slug = ?, category = ?, excerpt = ?, content_html = ?, featured_image = ?,
       status = ?, published_at = ?, updated_at = ?, meta_title = ?, meta_description = ?, og_image = ?
     WHERE id = ?`
  ).bind(
    a.title, a.slug, a.category, a.excerpt, a.contentHtml, a.featuredImage,
    a.status, a.publishedAt, a.updatedAt, a.metaTitle, a.metaDescription, a.ogImage, id
  ).run();
}

export async function deleteArticle(env, id) {
  await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
}
