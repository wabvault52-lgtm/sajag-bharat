// functions/_lib/render.js
// Pure-JS server-side HTML rendering. No fs, no external templating engine —
// this file is imported both by the local build script (scripts/generate.js,
// running in Node) and by the Cloudflare Pages Functions (running in the
// Workers runtime), so it deliberately avoids anything Node-only.

const HI_MONTHS = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
];

export function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDateHi(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${HI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTimeHi(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "अपराह्न" : "पूर्वाह्न";
  const h12 = ((hours + 11) % 12) + 1;
  return `${formatDateHi(iso)}, ${h12}:${mins} ${period}`;
}

function categoryBySlug(categories, slug) {
  return categories.find((c) => c.slug === slug) || { slug, name: slug, color: "#1B2A4A" };
}

function isFresh(iso, hours = 20) {
  const published = new Date(iso).getTime();
  return Date.now() - published < hours * 3600 * 1000;
}

function articleUrl(article) {
  return `/news/${article.slug}`;
}

function categoryUrl(category) {
  return `/category/${category.slug}`;
}

// ---------- shared partials ----------

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url; // already absolute (e.g. imgbb, any external host)
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function renderHead({ title, description, canonical, ogImage, ogType = "website", siteMeta, jsonLd }) {
  const fullTitle = escapeHtml(title);
  const desc = escapeHtml(description || siteMeta.tagline);
  const url = canonical;
  const image = ogImage || `${siteMeta.baseUrl}/assets/images/og-default.png`;
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fullTitle}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteMeta.name)} RSS" href="${siteMeta.baseUrl}/rss.xml">
  <meta property="og:site_name" content="${escapeHtml(siteMeta.name)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta property="og:locale" content="${siteMeta.locale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${siteMeta.twitterHandle}">
  <meta name="twitter:title" content="${fullTitle}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${image}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rozha+One&family=Hind:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}`;
}

function renderMasthead(categories, activeSlug, siteMeta) {
  const links = categories
    .map(
      (c) =>
        `<a href="${categoryUrl(c)}" class="nav-link${c.slug === activeSlug ? " is-active" : ""}" style="--cat-color:${c.color}">${escapeHtml(c.name)}</a>`
    )
    .join("");
  return `<header class="masthead">
    <div class="masthead-top">
      <a href="/" class="brand">
        <span class="brand-mark" aria-hidden="true"><span class="beacon"></span></span>
        <span class="brand-text">
          <span class="brand-name">${escapeHtml(siteMeta.name)}</span>
          <span class="brand-tagline">${escapeHtml(siteMeta.tagline)}</span>
        </span>
      </a>
      <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="primaryNav" aria-label="मेनू खोलें">
        <span></span><span></span><span></span>
      </button>
    </div>
    <nav class="primary-nav" id="primaryNav">
      <a href="/" class="nav-link${!activeSlug ? " is-active" : ""}">मुखपृष्ठ</a>
      <a href="/latest" class="nav-link">ताज़ा ख़बरें</a>
      ${links}
    </nav>
  </header>`;
}

function renderTicker(latestArticles, categories) {
  const items = latestArticles
    .slice(0, 6)
    .map((a) => `<a href="${articleUrl(a)}" class="ticker-item">${escapeHtml(a.title)}</a>`)
    .join("");
  return `<div class="ticker" role="region" aria-label="ताज़ा सुर्खियाँ">
    <div class="ticker-label"><span class="beacon beacon--sm"></span> लाइव</div>
    <div class="ticker-track">${items}</div>
  </div>`;
}

function renderFooter(categories, siteMeta) {
  const catLinks = categories
    .map((c) => `<a href="${categoryUrl(c)}">${escapeHtml(c.name)}</a>`)
    .join("");
  return `<footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="brand-name">${escapeHtml(siteMeta.name)}</span>
        <p>${escapeHtml(siteMeta.tagline)}</p>
      </div>
      <div class="footer-col">
        <h3>श्रेणियाँ</h3>
        <nav class="footer-links">${catLinks}</nav>
      </div>
      <div class="footer-col">
        <h3>जानकारी</h3>
        <nav class="footer-links">
          <a href="/about">हमारे बारे में</a>
          <a href="/contact">संपर्क करें</a>
          <a href="/privacy-policy">गोपनीयता नीति</a>
          <a href="/disclaimer">अस्वीकरण</a>
        </nav>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} ${escapeHtml(siteMeta.name)}. सर्वाधिकार सुरक्षित।</span>
    </div>
  </footer>`;
}

function renderArticleCard(article, categories, { featured = false } = {}) {
  const cat = categoryBySlug(categories, article.category);
  const fresh = isFresh(article.publishedAt);
  return `<article class="card${featured ? " card--featured" : ""}">
    <a href="${articleUrl(article)}" class="card-media" style="--cat-color:${cat.color}" aria-hidden="true">
      ${article.featuredImage ? `<img src="${escapeHtml(article.featuredImage)}" alt="" loading="lazy">` : `<span class="card-media-fallback">${escapeHtml(cat.name)}</span>`}
    </a>
    <div class="card-body">
      <a href="${categoryUrl(cat)}" class="tag" style="--cat-color:${cat.color}">${escapeHtml(cat.name)}</a>
      ${fresh ? `<span class="tag tag--fresh"><span class="beacon beacon--sm"></span> अभी-अभी</span>` : ""}
      <h3 class="card-title"><a href="${articleUrl(article)}">${escapeHtml(article.title)}</a></h3>
      ${featured ? `<p class="card-excerpt">${escapeHtml(article.excerpt)}</p>` : ""}
      <time class="card-time" datetime="${article.publishedAt}">${formatDateHi(article.publishedAt)}</time>
    </div>
  </article>`;
}

function htmlShell({ head, bodyClass = "", body }) {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
${head}
</head>
<body class="${bodyClass}">
${body}
<script src="/assets/js/main.js" defer></script>
</body>
</html>`;
}

// ---------- page renderers ----------

export function renderIndexPage({ articles, categories, siteMeta }) {
  const published = articles
    .filter((a) => a.status === "published")
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const lead = published[0];
  const secondary = published.slice(1, 5);
  const rest = published.slice(5, 13);

  const head = renderHead({
    title: `${siteMeta.name} — ${siteMeta.tagline}`,
    description: siteMeta.tagline,
    canonical: siteMeta.baseUrl + "/",
    siteMeta
  });

  const leadHtml = lead
    ? `<div class="lead-story">${renderArticleCard(lead, categories, { featured: true })}</div>`
    : "";
  const secondaryHtml = secondary.map((a) => renderArticleCard(a, categories)).join("");

  const categorySections = categories
    .map((cat) => {
      const items = published.filter((a) => a.category === cat.slug).slice(0, 4);
      if (items.length === 0) return "";
      return `<section class="category-strip">
        <div class="category-strip-head" style="--cat-color:${cat.color}">
          <h2><a href="${categoryUrl(cat)}">${escapeHtml(cat.name)}</a></h2>
          <a href="${categoryUrl(cat)}" class="see-all">सभी देखें →</a>
        </div>
        <div class="card-grid card-grid--4">${items.map((a) => renderArticleCard(a, categories)).join("")}</div>
      </section>`;
    })
    .join("");

  const body = `${renderMasthead(categories, null, siteMeta)}
  ${renderTicker(published, categories)}
  <main>
    <section class="hero-grid">
      ${leadHtml}
      <div class="secondary-grid">${secondaryHtml}</div>
    </section>
    ${rest.length ? `<section class="category-strip"><div class="category-strip-head"><h2>ताज़ा ख़बरें</h2></div><div class="card-grid card-grid--4">${rest.map((a) => renderArticleCard(a, categories)).join("")}</div></section>` : ""}
    ${categorySections}
  </main>
  ${renderFooter(categories, siteMeta)}`;

  return htmlShell({ head, bodyClass: "page-home", body });
}

export function renderCategoryPage({ category, articles, categories, siteMeta }) {
  const published = articles
    .filter((a) => a.status === "published" && a.category === category.slug)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const head = renderHead({
    title: `${category.name} की ख़बरें | ${siteMeta.name}`,
    description: `${siteMeta.name} पर ${category.name} श्रेणी की सभी ताज़ा ख़बरें।`,
    canonical: `${siteMeta.baseUrl}/category/${category.slug}`,
    siteMeta
  });

  const body = `${renderMasthead(categories, category.slug, siteMeta)}
  <main>
    <div class="page-header" style="--cat-color:${category.color}">
      <h1>${escapeHtml(category.name)}</h1>
      <p>${escapeHtml(category.name)} श्रेणी की सभी ख़बरें</p>
    </div>
    <div class="card-grid card-grid--4">
      ${published.length ? published.map((a) => renderArticleCard(a, categories)).join("") : `<p class="empty-state">इस श्रेणी में अभी कोई ख़बर प्रकाशित नहीं हुई है।</p>`}
    </div>
  </main>
  ${renderFooter(categories, siteMeta)}`;

  return htmlShell({ head, bodyClass: "page-category", body });
}

export function renderLatestPage({ articles, categories, siteMeta }) {
  const published = articles
    .filter((a) => a.status === "published")
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const head = renderHead({
    title: `ताज़ा ख़बरें | ${siteMeta.name}`,
    description: `${siteMeta.name} पर सबसे नई और ताज़ा ख़बरें, प्रकाशन के क्रम में।`,
    canonical: `${siteMeta.baseUrl}/latest`,
    siteMeta
  });

  const body = `${renderMasthead(categories, null, siteMeta)}
  <main>
    <div class="page-header">
      <h1>ताज़ा ख़बरें</h1>
      <p>सबसे नई ख़बरें सबसे ऊपर</p>
    </div>
    <div class="card-grid card-grid--4">
      ${published.map((a) => renderArticleCard(a, categories)).join("")}
    </div>
  </main>
  ${renderFooter(categories, siteMeta)}`;

  return htmlShell({ head, bodyClass: "page-latest", body });
}

export function renderArticlePage({ article, categories, allArticles, siteMeta }) {
  const cat = categoryBySlug(categories, article.category);
  const related = allArticles
    .filter((a) => a.status === "published" && a.category === article.category && a.id !== article.id)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 3);

  const canonical = `${siteMeta.baseUrl}${articleUrl(article)}`;
  const image = toAbsoluteUrl(article.ogImage || article.featuredImage, siteMeta.baseUrl) || `${siteMeta.baseUrl}/assets/images/og-default.png`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.metaDescription || article.excerpt,
    image: [image],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: [{ "@type": "Organization", name: siteMeta.name }],
    publisher: {
      "@type": "Organization",
      name: siteMeta.name,
      logo: { "@type": "ImageObject", url: `${siteMeta.baseUrl}/assets/images/logo.png` }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    articleSection: cat.name,
    inLanguage: "hi"
  };

  const head = renderHead({
    title: article.metaTitle || `${article.title} | ${siteMeta.name}`,
    description: article.metaDescription || article.excerpt,
    canonical,
    ogImage: image,
    ogType: "article",
    siteMeta,
    jsonLd
  });

  const body = `${renderMasthead(categories, cat.slug, siteMeta)}
  <main>
    <article class="article-page">
      <nav class="breadcrumb"><a href="/">मुखपृष्ठ</a> / <a href="${categoryUrl(cat)}">${escapeHtml(cat.name)}</a></nav>
      <a href="${categoryUrl(cat)}" class="tag" style="--cat-color:${cat.color}">${escapeHtml(cat.name)}</a>
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
      <div class="article-meta">
        <time datetime="${article.publishedAt}">${formatDateTimeHi(article.publishedAt)}</time>
        <span class="byline">${escapeHtml(siteMeta.name)} डेस्क</span>
      </div>
      ${article.featuredImage ? `<img class="article-image" src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.title)}">` : ""}
      <div class="article-body">${article.contentHtml}</div>
      <div class="share-row">
        <span>शेयर करें:</span>
        <a href="https://wa.me/?text=${encodeURIComponent(article.title + " " + canonical)}" target="_blank" rel="noopener">WhatsApp</a>
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">X</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">Facebook</a>
      </div>
    </article>
    ${related.length ? `<section class="category-strip"><div class="category-strip-head"><h2>${escapeHtml(cat.name)} से जुड़ी और ख़बरें</h2></div><div class="card-grid card-grid--4">${related.map((a) => renderArticleCard(a, categories)).join("")}</div></section>` : ""}
  </main>
  ${renderFooter(categories, siteMeta)}`;

  return htmlShell({ head, bodyClass: "page-article", body });
}

export function renderNotFoundPage({ categories, siteMeta }) {
  const head = renderHead({
    title: `पेज नहीं मिला | ${siteMeta.name}`,
    description: "यह पेज उपलब्ध नहीं है।",
    canonical: `${siteMeta.baseUrl}/404`,
    siteMeta
  });
  const body = `${renderMasthead(categories, null, siteMeta)}
  <main>
    <div class="not-found">
      <span class="beacon"></span>
      <h1>404</h1>
      <p>माफ़ करें, यह पेज नहीं मिला। हो सकता है लिंक ग़लत हो या पेज हटा दिया गया हो।</p>
      <a href="/" class="btn-link">मुखपृष्ठ पर जाएँ →</a>
    </div>
  </main>
  ${renderFooter(categories, siteMeta)}`;
  return htmlShell({ head, bodyClass: "page-404", body });
}

export function renderStaticPage({ title, description, bodyHtml, categories, siteMeta, path }) {
  const head = renderHead({
    title: `${title} | ${siteMeta.name}`,
    description,
    canonical: `${siteMeta.baseUrl}${path}`,
    siteMeta
  });
  const body = `${renderMasthead(categories, null, siteMeta)}
  <main>
    <article class="static-page">
      <h1>${escapeHtml(title)}</h1>
      ${bodyHtml}
    </article>
  </main>
  ${renderFooter(categories, siteMeta)}`;
  return htmlShell({ head, bodyClass: "page-static", body });
}

// ---------- feeds ----------

export function renderSitemapXml({ articles, categories, siteMeta }) {
  const staticUrls = ["/", "/latest", "/about", "/contact", "/privacy-policy", "/disclaimer"];
  const catUrls = categories.map((c) => `/category/${c.slug}`);
  const articleUrls = articles.filter((a) => a.status === "published").map((a) => articleUrl(a));
  const all = [...staticUrls, ...catUrls, ...articleUrls];
  const urlsXml = all
    .map((u) => `  <url><loc>${siteMeta.baseUrl}${u}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
}

export function renderRobotsTxt(siteMeta) {
  return `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${siteMeta.baseUrl}/sitemap.xml`;
}

export function renderRssXml({ articles, siteMeta }) {
  const published = articles
    .filter((a) => a.status === "published")
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 30);
  const items = published
    .map(
      (a) => `  <item>
    <title>${escapeHtml(a.title)}</title>
    <link>${siteMeta.baseUrl}${articleUrl(a)}</link>
    <guid>${siteMeta.baseUrl}${articleUrl(a)}</guid>
    <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    <description>${escapeHtml(a.excerpt)}</description>
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeHtml(siteMeta.name)}</title>
  <link>${siteMeta.baseUrl}</link>
  <description>${escapeHtml(siteMeta.tagline)}</description>
  <language>hi</language>
${items}
</channel>
</rss>`;
}
