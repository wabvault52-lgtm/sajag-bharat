// functions/_lib/github.js
// GitHub is now used ONLY as image storage (articles themselves live in
// D1). Uploading an image commits it to the repo, which still triggers a
// normal Cloudflare Pages redeploy — harmless, since Functions have no
// build step and the redeploy finishes in a few seconds.

const API = "https://api.github.com";

export async function putImageFile(env, path, base64Content, message) {
  const url = `${API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sajag-bharat-admin",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: env.GITHUB_BRANCH || "main"
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}
