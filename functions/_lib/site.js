// functions/_lib/site.js
// Orchestrates a "publish": given the current in-memory articles/categories,
// re-render every static page that could have changed and commit them —
// plus the updated data/articles.json — to GitHub in a single atomic commit.
// A GitHub push to the tracked branch is what triggers Cloudflare Pages to
// rebuild and deploy automatically.

import {
  renderIndexPage,
  renderLatestPage,
  renderCategoryPage,
  renderArticlePage,
  renderSitemapXml,
  renderRssXml
} from "./render.js";
import { commitFiles } from "./github.js";

/**
 * @param {object} opts
 * @param {object} opts.env - Cloudflare env bindings (GITHUB_TOKEN etc.)
 * @param {object[]} opts.articles - full, updated articles array
 * @param {object[]} opts.categories
 * @param {object} opts.siteMeta
 * @param {string} opts.message - commit message
 * @param {string[]} [opts.staleSlugs] - old article slugs whose HTML file should be deleted (e.g. slug changed, or article deleted)
 */
export async function publishSite({ env, articles, categories, siteMeta, message, staleSlugs = [] }) {
  const files = [];

  files.push({ path: "public/index.html", content: renderIndexPage({ articles, categories, siteMeta }) });
  files.push({ path: "public/latest.html", content: renderLatestPage({ articles, categories, siteMeta }) });

  for (const cat of categories) {
    files.push({
      path: `public/category/${cat.slug}.html`,
      content: renderCategoryPage({ category: cat, articles, categories, siteMeta })
    });
  }

  for (const article of articles) {
    if (article.status !== "published") continue;
    files.push({
      path: `public/news/${article.slug}.html`,
      content: renderArticlePage({ article, categories, allArticles: articles, siteMeta })
    });
  }

  files.push({ path: "public/sitemap.xml", content: renderSitemapXml({ articles, categories, siteMeta }) });
  files.push({ path: "public/rss.xml", content: renderRssXml({ articles, siteMeta }) });
  files.push({ path: "data/articles.json", content: JSON.stringify(articles, null, 2) });

  const deletePaths = staleSlugs.map((slug) => `public/news/${slug}.html`);

  return commitFiles(env, { message, files, deletePaths });
}
