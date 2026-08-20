// functions/api/categories.js
import { readJson } from "../_lib/github.js";

export async function onRequestGet({ env }) {
  try {
    const categories = (await readJson(env, "data/categories.json")) || [];
    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "GitHub से श्रेणियाँ पढ़ने में विफल" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
