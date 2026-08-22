// functions/api/articles/index.js
import { listArticles, listCategories, slugTaken, createArticle } from "../../_lib/db.js";
import { validateArticlePayload } from "../../_lib/validate.js";

export async function onRequestGet({ env }) {
  try {
    const articles = await listArticles(env);
    return json({ articles });
  } catch (err) {
    console.error(err);
    return json({ error: "डेटाबेस से लेख पढ़ने में विफल" }, 502);
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

  try {
    const categories = await listCategories(env);
    if (!categories.some((c) => c.slug === body.category)) {
      return json({ error: "अमान्य श्रेणी" }, 400);
    }

    if (await slugTaken(env, body.slug)) {
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

    await createArticle(env, article);
    return json({ article }, 201);
  } catch (err) {
    console.error(err);
    return json({ error: "डेटाबेस में सेव करने में विफल: " + err.message }, 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
