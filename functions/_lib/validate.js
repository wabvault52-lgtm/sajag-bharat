// functions/_lib/validate.js
export function validateArticlePayload(body) {
  if (!body || typeof body !== "object") return { error: "अमान्य अनुरोध" };
  const required = ["title", "slug", "category", "excerpt", "contentHtml"];
  for (const field of required) {
    if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
      return { error: `फ़ील्ड आवश्यक है: ${field}` };
    }
  }
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return { error: "स्लग में केवल छोटे अक्षर, संख्याएँ और हाइफ़न मान्य हैं" };
  }
  return {};
}
