// functions/api/articles/[id].js
import { getArticleById, listCategories, slugTaken, updateArticle, deleteArticle } from "../../_lib/db.js";
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

  try {
    const existing = await getArticleById(env, params.id);
    if (!existing) return json({ error: "लेख नहीं मिला" }, 404);

    const categories = await listCategories(env);
    if (!categories.some((c) => c.slug === body.category)) {
      return json({ error: "अमान्य श्रेणी" }, 400);
    }

    if (await slugTaken(env, body.slug, params.id)) {
      return json({ error: "यह स्लग पहले से उपयोग में है, कृपया दूसरा स्लग चुनें" }, 409);
    }

    const now = new Date().toISOString();
    const wasPublished = existing.status === "published";
    const isPublished = body.status === "published";
    const publishedAt = !wasPublished && isPublished ? now : existing.publishedAt;

    const updated = {
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

    await updateArticle(env, params.id, updated);
    return json({ article: { id: params.id, ...updated } });
  } catch (err) {
    console.error(err);
    return json({ error: "डेटाबेस में सेव करने में विफल: " + err.message }, 502);
  }
}

export async function onRequestDelete({ env, params }) {
  try {
    const existing = await getArticleById(env, params.id);
    if (!existing) return json({ error: "लेख नहीं मिला" }, 404);

    await deleteArticle(env, params.id);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "डेटाबेस से हटाने में विफल: " + err.message }, 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
