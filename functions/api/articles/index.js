// functions/api/articles/index.js
import { readJson } from "../../_lib/github.js";
import { publishSite } from "../../_lib/site.js";
import { validateArticlePayload } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  try {
    const articles = (await readJson(env, "data/articles.json")) || [];
    return json({ articles });
  } catch (err) {
    console.error(err);
    return json({ error: "GitHub से लेख पढ़ने में विफल" }, 502);
  }
}

export async function onRequestPost({ request, env }) {
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

  if (!categories.some((c) => c.slug === body.category)) {
    return json({ error: "अमान्य श्रेणी" }, 400);
  }
  if (articles.some((a) => a.slug === body.slug)) {
    return json({ error: "यह स्लग पहले से उपयोग में है, कृपया दूसरा स्लग चुनें" }, 409);
  }

  const now = new Date().toISOString();
  const article = {
    id: crypto.randomUUID(),
    title: body.title,
    slug: body.slug,
    category: body.category,
    excerpt: body.excerpt,
    contentHtml: body.contentHtml,
    featuredImage: body.featuredImage || null,
    status: body.status === "published" ? "published" : "draft",
    publishedAt: now,
    updatedAt: now,
    metaTitle: body.metaTitle || null,
    metaDescription: body.metaDescription || null,
    ogImage: body.featuredImage || null
  };

  const updatedArticles = [...articles, article];

  try {
    await publishSite({
      env,
      articles: updatedArticles,
      categories,
      siteMeta,
      message: `लेख जोड़ा गया: ${article.title}`
    });
  } catch (err) {
    return json({ error: "GitHub पर प्रकाशित करने में विफल: " + err.message }, 502);
  }

  return json({ article }, 201);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
