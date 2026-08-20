// functions/_lib/github.js
// Talks to the GitHub REST API so the repo itself is the database + image
// store. Uses the Git Data API (blobs → tree → commit → ref update) so a
// "publish" that touches several files (article HTML, index.html, category
// page, sitemap.xml, rss.xml, articles.json) lands as ONE atomic commit —
// never a half-published state.

const API = "https://api.github.com";

function authHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sajag-bharat-admin"
  };
}

function repoBase(env) {
  return `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
}

function branch(env) {
  return env.GITHUB_BRANCH || "main";
}

async function ghFetch(env, path, options = {}) {
  const res = await fetch(`${repoBase(env)}${path}`, {
    ...options,
    headers: { ...authHeaders(env), ...(options.headers || {}) }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} for ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Read a single file's content (utf-8 string) + sha. Returns null if missing. */
export async function readFile(env, filePath) {
  try {
    const data = await ghFetch(env, `/contents/${filePath}?ref=${branch(env)}`);
    const content = decodeBase64Utf8(data.content);
    return { content, sha: data.sha };
  } catch (err) {
    if (String(err.message).includes(" 404 ")) return null;
    throw err;
  }
}

export async function readJson(env, filePath) {
  const file = await readFile(env, filePath);
  return file ? JSON.parse(file.content) : null;
}

/**
 * Commit several files in one atomic commit.
 * files: [{ path, content, encoding: "utf-8" | "base64" }]
 * deletePaths: [path, ...] — files to remove in the same commit
 */
export async function commitFiles(env, { message, files = [], deletePaths = [] }) {
  const br = branch(env);
  const ref = await ghFetch(env, `/git/ref/heads/${br}`);
  const latestCommitSha = ref.object.sha;
  const latestCommit = await ghFetch(env, `/git/commits/${latestCommitSha}`);
  const baseTreeSha = latestCommit.tree.sha;

  const treeEntries = [];

  for (const f of files) {
    const blobContent = f.encoding === "base64" ? f.content : encodeBase64Utf8(f.content);
    const blob = await ghFetch(env, `/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: blobContent, encoding: "base64" })
    });
    treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  for (const p of deletePaths) {
    treeEntries.push({ path: p, mode: "100644", type: "blob", sha: null });
  }

  const newTree = await ghFetch(env, `/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries })
  });

  const newCommit = await ghFetch(env, `/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [latestCommitSha] })
  });

  await ghFetch(env, `/git/refs/heads/${br}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha })
  });

  return newCommit.sha;
}

function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function decodeBase64Utf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
