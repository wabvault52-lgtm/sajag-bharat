# सजग भारत (Sajag Bharat)

Hindi-language news portal. Pure HTML/CSS/JS frontend (rendered on request
by Cloudflare Pages Functions), articles stored in **Cloudflare D1** (a
real SQL database), and **GitHub used only as image storage**.

---

## How it actually works

1. Every page (`/`, `/news/:slug`, `/category/:slug`, `/latest`, etc.) is
   rendered **on request** by a small Cloudflare Pages Function that reads
   from D1 and returns plain HTML — no client-side framework, nothing to
   build.
2. The **admin panel** (`/admin`) is static HTML/CSS/JS that calls a small
   API (`/functions/api/*`).
3. Publishing or editing an article writes straight to D1 — **no GitHub
   commit, no redeploy wait**. The change is live on the next page
   request, instantly.
4. Uploading an image commits it to your GitHub repo under
   `public/assets/images/`. That commit still triggers a normal Cloudflare
   Pages redeploy (a few seconds, since there's no build step) — this is
   the one thing that still touches GitHub.

Because `functions/_lib/render.js` is pure JS with no Node-only APIs, it
runs identically for every route.

---

## One-time setup

### 1. Push this project to a GitHub repo
(You've likely already done this.)

### 2. Create the D1 database

Cloudflare dashboard → **Storage & databases → D1 SQL Database → Create
database**. Name it `sajag-bharat-db`.

Once created, open it and go to its **Console** tab. Paste the entire
contents of `db/schema.sql` and run it. Then paste the entire contents of
`db/seed.sql` and run it. This creates the tables and loads the 8
categories plus a few placeholder articles.

Copy the **Database ID** shown on the database's overview page — you'll
need it in step 4.

### 3. Create a GitHub Personal Access Token (for images only)

GitHub → Settings → Developer settings → Fine-grained tokens → Generate
new token. Scope it to **this one repository**, with **Contents: Read and
write** permission. Copy the token.

### 4. Connect D1 to your Pages project

In your Cloudflare Pages project → **Settings → Functions → D1 database
bindings → Add binding**:
- Variable name: `DB`
- D1 database: `sajag-bharat-db`

Also update `database_id` in `wrangler.toml` with the ID from step 2, and
push that change (keeps local dev in sync — the live binding is what
actually matters in production, set via the dashboard above).

### 5. Set environment variables

Pages project → Settings → Environment variables:

| Name | Type | Value |
|---|---|---|
| `GITHUB_TOKEN` | secret | the token from step 3 |
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

### 6. Log in

Visit `https://<your-site>.pages.dev/admin/login` and log in. Every
save is instant — no waiting for a GitHub deploy, unless you also
uploaded a new image in that save.

---

## Local development

```bash
npm install
npm run db:migrate:local     # creates + seeds a local D1 database
npm run dev                  # wrangler pages dev, with D1 bound automatically from wrangler.toml
```

Then open `http://localhost:8788` (or whatever port wrangler prints).

Note: the admin API still calls the **real** GitHub API for image
uploads — there's no local mock — so uploading an image during local dev
genuinely commits to your repo.

---

## Project structure

```
public/
  admin/login.html, admin/dashboard.html   ← static admin UI
  assets/css, assets/js, assets/images     ← static assets

functions/
  index.js, latest.js, about.js, ...       ← one Function per public route
  category/[slug].js, news/[slug].js       ← dynamic routes
  sitemap.xml.js, robots.txt.js, rss.xml.js
  [[catchall]].js                          ← serves static assets that
                                              don't match a route, then a
                                              branded 404 for anything else
  _middleware.js                           ← auth gate for /admin/* and /api/*
  _lib/
    db.js            ← all D1 queries
    render.js         ← HTML templates (shared by every route Function)
    site-config.js     ← site name/tagline/base URL
    static-pages.js     ← content for about/contact/privacy/disclaimer
    github.js             ← image upload only
    auth.js                ← session cookie + PBKDF2 password check (Web Crypto, zero dependencies)
    validate.js
  api/
    auth/login.js, auth/logout.js
    categories.js
    articles/index.js      ← GET list, POST create
    articles/[id].js       ← PUT update, DELETE
    media/upload.js        ← image upload to GitHub

db/
  schema.sql        ← run once in the D1 Console
  seed.sql           ← run once, loads categories + sample articles

scripts/
  hash-password.js  ← generates ADMIN_PASSWORD_HASH
```

---

## Known limitations (by design, for v1)

- **Single admin user** — one username/password, no roles or multiple
  accounts.
- **Categories are fixed at v1** — add/edit/remove by editing `db/seed.sql`
  -style INSERT statements directly in the D1 Console, rather than through
  the admin UI.
- **Images aren't resized/optimized** on upload — stored exactly as
  uploaded.
- Update `baseUrl` in `functions/_lib/site-config.js` to your real domain
  before going live — it's used in canonical URLs, the sitemap, RSS, and
  Open Graph tags.

---

## Update the sample content

`db/seed.sql` loads a handful of clearly-labeled placeholder articles so
the site isn't empty on first load. Delete or edit them from the admin
panel once you're logged in.
