// scripts/generate.js
// Local build script (Node only). Reads the JSON "database" in /data and
// writes plain static HTML/XML into /public using the shared render library
// in functions/_lib/render.js — the SAME functions the Cloudflare Function
// uses at publish-time, so local output and live output never drift apart.
//
// Usage: npm run generate

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  renderIndexPage,
  renderCategoryPage,
  renderLatestPage,
  renderArticlePage,
  renderStaticPage,
  renderNotFoundPage,
  renderSitemapXml,
  renderRobotsTxt,
  renderRssXml
} from "../functions/_lib/render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const PUBLIC = path.join(ROOT, "public");

async function readJson(name) {
  const raw = await readFile(path.join(DATA, name), "utf-8");
  return JSON.parse(raw);
}

async function writeOut(relPath, content) {
  const full = path.join(PUBLIC, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, "utf-8");
  console.log("  ✓", relPath);
}

const STATIC_PAGES = [
  {
    path: "/about",
    file: "about.html",
    title: "हमारे बारे में",
    description: "सजग भारत के बारे में जानें — हमारा उद्देश्य और संपादकीय दृष्टिकोण।",
    bodyHtml: `
      <p>सजग भारत एक हिंदी समाचार पोर्टल है, जिसका उद्देश्य पाठकों तक देश-दुनिया की ख़बरें सरल, स्पष्ट और समय पर पहुँचाना है।</p>
      <p>हम राष्ट्रीय-अंतरराष्ट्रीय घटनाओं, तकनीक, शिक्षा, मनोरंजन, खेल, व्यापार और स्वास्थ्य से जुड़ी ख़बरों को कवर करते हैं।</p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया एडमिन पैनल से या इस फ़ाइल को संपादित कर के वास्तविक जानकारी जोड़ें।</em></p>`
  },
  {
    path: "/contact",
    file: "contact.html",
    title: "संपर्क करें",
    description: "सजग भारत टीम से संपर्क करने के लिए जानकारी।",
    bodyHtml: `
      <p>किसी भी सुझाव, शिकायत या समाचार सूचना के लिए हमसे संपर्क करें:</p>
      <p>ईमेल: <a href="mailto:contact@sajagbharat.example">contact@sajagbharat.example</a></p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया वास्तविक संपर्क जानकारी जोड़ें।</em></p>`
  },
  {
    path: "/privacy-policy",
    file: "privacy-policy.html",
    title: "गोपनीयता नीति",
    description: "सजग भारत की गोपनीयता नीति।",
    bodyHtml: `
      <p>यह गोपनीयता नीति बताती है कि सजग भारत आपकी जानकारी का उपयोग कैसे करता है।</p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया अपनी वास्तविक गोपनीयता नीति यहाँ जोड़ें (डेटा संग्रहण, कुकीज़, विज्ञापन आदि से जुड़े विवरण सहित)।</em></p>`
  },
  {
    path: "/disclaimer",
    file: "disclaimer.html",
    title: "अस्वीकरण",
    description: "सजग भारत का अस्वीकरण।",
    bodyHtml: `
      <p>इस वेबसाइट पर प्रकाशित सामग्री केवल सामान्य जानकारी के उद्देश्य से है।</p>
      <p><em>यह एक नमूना पृष्ठ है — कृपया अपना वास्तविक अस्वीकरण यहाँ जोड़ें।</em></p>`
  }
];

async function main() {
  console.log("Sajag Bharat — building static site...\n");

  const [articles, categories, siteMeta] = await Promise.all([
    readJson("articles.json"),
    readJson("categories.json"),
    readJson("site.json")
  ]);

  await writeOut("index.html", renderIndexPage({ articles, categories, siteMeta }));
  await writeOut("latest.html", renderLatestPage({ articles, categories, siteMeta }));

  for (const cat of categories) {
    await writeOut(
      `category/${cat.slug}.html`,
      renderCategoryPage({ category: cat, articles, categories, siteMeta })
    );
  }

  for (const article of articles) {
    if (article.status !== "published") continue;
    await writeOut(
      `news/${article.slug}.html`,
      renderArticlePage({ article, categories, allArticles: articles, siteMeta })
    );
  }

  for (const page of STATIC_PAGES) {
    await writeOut(
      page.file,
      renderStaticPage({
        title: page.title,
        description: page.description,
        bodyHtml: page.bodyHtml,
        categories,
        siteMeta,
        path: page.path
      })
    );
  }

  // Cloudflare Pages automatically serves /404.html for any unmatched route.
  await writeOut("404.html", renderNotFoundPage({ categories, siteMeta }));

  await writeOut("sitemap.xml", renderSitemapXml({ articles, categories, siteMeta }));
  await writeOut("robots.txt", renderRobotsTxt(siteMeta));
  await writeOut("rss.xml", renderRssXml({ articles, siteMeta }));

  console.log("\nDone. Output written to /public.");
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
