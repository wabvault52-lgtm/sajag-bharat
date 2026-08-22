// functions/robots.txt.js — GET /robots.txt
import { renderRobotsTxt } from "./_lib/render.js";
import { siteMeta } from "./_lib/site-config.js";

export async function onRequestGet() {
  return new Response(renderRobotsTxt(siteMeta), {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
