# सजग भारत (Sajag Bharat)

Hindi-language news portal. Pure static HTML/CSS/JS on the frontend, a
lightweight Node-compatible backend (Cloudflare Pages Functions) powering
the admin panel, and **GitHub as the only data + image store** — no
separate database, no separate file storage.

---

## How it actually works

1. The **public site** (`/public`) is plain static HTML/CSS/JS. No
   framework, no client-side rendering, no build step needed to view it.
2. The **admin panel** (`/public/admin`) is also plain HTML/CSS/JS. It
   talks to a small API.
3. The **API** (`/functions/api/*`) runs as Cloudflare Pages Functions.
   When you publish or edit an article, the function:
   - re-renders every static page that changed (the article page, the
     homepage, the relevant category page, `sitemap.xml`, `rss.xml`)
   - commits all of it — plus the updated `data/articles.json` — to your
     GitHub repo **in one atomic commit** (using the Git Data API, so
     nothing is ever half-published)
4. That push is what **triggers Cloudflare Pages to rebuild and deploy**
   automatically. No manual redeploy step.
5. Uploaded images are committed straight into
   `public/assets/images/` in the same repo.

Because the rendering functions (`functions/_lib/render.js`) are pure JS
with no `fs` or Node-only APIs, the exact same code runs locally (via
`scripts/generate.js`, in Node) and inside the Cloudflare Function (in the
Workers runtime) — so local output and live output can never drift apart.

---

## One-time setup

### 1. Push this project to a new GitHub repo

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Create a GitHub Personal Access Token

GitHub → Settings → Developer settings → Fine-grained tokens → Generate
new token. Scope it to **this one repository only**, with **Contents:
Read and write** permission. Copy the token — you'll paste it into
Cloudflare in step 4.

### 3. Connect the repo to Cloudflare Pages

Cloudflare dashboard → Workers & Pages → Create → Pages → connect your
GitHub repo. Build settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `public` |

The site is already fully pre-rendered in `/public`, so Cloudflare Pages
doesn't need to build anything — it just serves the files, and the admin
panel keeps them updated via GitHub commits.

### 4. Set environment variables

In the Pages project → Settings → Environment variables, add:

| Name | Type | Value |
|---|---|---|
| `GITHUB_TOKEN` | secret | the token from step 2 |
| `GITHUB_OWNER` | plain | your GitHub username/org |
| `GITHUB_REPO` | plain | this repo's name |
| `GITHUB_BRANCH` | plain | `main` |
| `ADMIN_USERNAME` | plain | whatever login username you want |
| `ADMIN_PASSWORD_HASH` | secret | see below |
| `SESSION_SECRET` | secret | any long random string |

Generate the password hash locally:

```bash
npm install
node scripts/hash-password.js "your-chosen-password"
```

Generate a session secret:

```bash
openssl rand -hex 32
```

### 5. Log in

Visit `https://<your-site>.pages.dev/admin/login.html` and log in with
`ADMIN_USERNAME` + the password you hashed. Create/edit/delete articles
from there — every save republishes the live site within seconds.

---

## Local development

```bash
npm install
npm run generate   # builds /public from /data — no Cloudflare needed
```

Open `public/index.html` through a local static server (not `file://` —
absolute asset paths need a real server) to preview the public site:

```bash
npx serve public
```

`npm run dev` runs `wrangler pages dev`, which serves the Functions
locally too — but note the Functions still call the **real** GitHub API
(there's no local mock), so local admin-panel testing will genuinely
commit to your repo.

---

## Project structure

```
public/                  ← deployed as-is (Cloudflare Pages root)
  index.html, latest.html, about.html, ...
  category/<slug>.html
  news/<slug>.html
  admin/login.html, admin/dashboard.html
  assets/css, assets/js, assets/images
  sitemap.xml, robots.txt, rss.xml

functions/
  _middleware.js         ← auth gate for /admin/* and /api/*
  _lib/
    render.js             ← HTML templates (shared by generate.js AND the Functions)
    github.js             ← GitHub Git Data API client (atomic commits)
    site.js               ← "publish" orchestrator
    auth.js                ← session cookie + bcrypt password check
    validate.js
  api/
    auth/login.js, auth/logout.js
    categories.js
    articles/index.js      ← GET list, POST create
    articles/[id].js       ← PUT update, DELETE
    media/upload.js

data/
  articles.json           ← the "database"
  categories.json
  site.json               ← site name, tagline, base URL

scripts/
  generate.js             ← local build script
  hash-password.js        ← generates ADMIN_PASSWORD_HASH
```

---

## Known limitations (by design, for v1)

- **Single admin user** — one username/password, no roles or multiple
  accounts. Good enough for a solo operator; extend `data/site.json` /
  auth.js if you need more later.
- **`articles.json` as the database** — fine well beyond a few thousand
  articles. If it ever gets unwieldy, the render functions are already
  isolated in `_lib/render.js`, so migrating to Cloudflare D1 later is a
  contained change.
- **Categories are fixed at v1** — add/edit/remove categories by editing
  `data/categories.json` directly (then run `npm run generate` locally,
  or commit + push) rather than through the admin UI.
- **Images aren't resized/optimized** on upload — they're stored exactly
  as uploaded. Compress before uploading if that matters to you.
- Update `baseUrl` in `data/site.json` to your real domain before going
  live — it's used in canonical URLs, the sitemap, RSS, and Open Graph
  tags.

---

## Update the sample content

`data/articles.json` ships with a handful of clearly-labeled placeholder
articles so you can see the site rendered end-to-end. Delete or edit them
from the admin panel once you're logged in.
