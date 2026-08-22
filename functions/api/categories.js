// functions/api/categories.js
import { listCategories } from "../_lib/db.js";

export async function onRequestGet({ env }) {
  try {
    const categories = await listCategories(env);
    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "डेटाबेस से श्रेणियाँ पढ़ने में विफल" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
