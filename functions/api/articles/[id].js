// functions/api/articles/[id].js
import { readJson } from "../../_lib/github.js";
import { publishSite } from "../../_lib/site.js";
import { validateArticlePayload } from "../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "अमान्य अनुरोध" }, 400);
  }

  const validation = validateArticlePayload(body);
  if (validation.error) return json({ error: validation.error }, 400);

  let articles, categories, siteMeta;
  try {
    [articles, categories, siteMeta] = await Promise.all([
      readJson(env, "data/articles.json"),
      readJson(env, "data/categories.json"),
      readJson(env, "data/site.json")
    ]);
  } catch (err) {
    console.error(err);
    return json({ error: "GitHub से मौजूदा डेटा पढ़ने में विफल" }, 502);
  }

  const index = articles.findIndex((a) => a.id === params.id);
  if (index === -1) return json({ error: "लेख नहीं मिला" }, 404);

  if (!categories.some((c) => c.slug === body.category)) {
    return json({ error: "अमान्य श्रेणी" }, 400);
  }
  const slugTaken = articles.some((a) => a.slug === body.slug && a.id !== params.id);
  if (slugTaken) return json({ error: "यह स्लग पहले से उपयोग में है, कृपया दूसरा स्लग चुनें" }, 409);

  const existing = articles[index];
  const slugChanged = existing.slug !== body.slug;
  const now = new Date().toISOString();

  const wasPublished = existing.status === "published";
  const isPublished = body.status === "published";
  const publishedAt = !wasPublished && isPublished ? now : existing.publishedAt;

  const updated = {
    ...existing,
    title: body.title,
    slug: body.slug,
    category: body.category,
    excerpt: body.excerpt,
    contentHtml: body.contentHtml,
    featuredImage: body.featuredImage || null,
    status: isPublished ? "published" : "draft",
    publishedAt,
    updatedAt: now,
    metaTitle: body.metaTitle || null,
    metaDescription: body.metaDescription || null,
    ogImage: body.featuredImage || existing.ogImage || null
  };

  const updatedArticles = [...articles];
  updatedArticles[index] = updated;

  try {
    await publishSite({
      env,
      articles: updatedArticles,
      categories,
      siteMeta,
      message: `लेख अपडेट हुआ: ${updated.title}`,
      staleSlugs: slugChanged ? [existing.slug] : []
    });
  } catch (err) {
    return json({ error: "GitHub पर प्रकाशित करने में विफल: " + err.message }, 502);
  }

  return json({ article: updated });
}

export async function onRequestDelete({ env, params }) {
  let articles, categories, siteMeta;
  try {
    [articles, categories, siteMeta] = await Promise.all([
      readJson(env, "data/articles.json"),
      readJson(env, "data/categories.json"),
      readJson(env, "data/site.json")
    ]);
  } catch (err) {
    console.error(err);
    return json({ error: "GitHub से मौजूदा डेटा पढ़ने में विफल" }, 502);
  }

  const target = articles.find((a) => a.id === params.id);
  if (!target) return json({ error: "लेख नहीं मिला" }, 404);

  const updatedArticles = articles.filter((a) => a.id !== params.id);

  try {
    await publishSite({
      env,
      articles: updatedArticles,
      categories,
      siteMeta,
      message: `लेख हटाया गया: ${target.title}`,
      staleSlugs: [target.slug]
    });
  } catch (err) {
    return json({ error: "GitHub पर प्रकाशित करने में विफल: " + err.message }, 502);
  }

  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
