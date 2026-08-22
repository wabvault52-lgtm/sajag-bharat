// public/assets/js/admin.js
// Vanilla JS admin client. Talks to the Cloudflare Pages Functions API
// (functions/api/*) using fetch + cookie-based session auth.

(function () {
  "use strict";

  // ---------------- shared helpers ----------------

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      throw new Error("अनधिकृत — कृपया दोबारा लॉगिन करें");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "कुछ गड़बड़ हो गई");
    return data;
  }

  // Devanagari → Latin transliteration so a Hindi title auto-generates a
  // valid a-z0-9- slug (the server only accepts that character set — see
  // functions/_lib/validate.js). Not linguistically perfect (no schwa
  // deletion), but every output is valid and reasonably readable.
  const DEVANAGARI_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v", "ळ": "l",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "क्ष": "ksh", "त्र": "tr", "ज्ञ": "gy"
  };
  const DEVANAGARI_MATRAS = {
    "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ः": "h", "ँ": "n"
  };
  const DEVANAGARI_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au"
  };
  const DEVANAGARI_DIGITS = { "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9" };
  const VIRAMA = "\u094D"; // ्

  function transliterateHindi(str) {
    const chars = Array.from(str);
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const tri = chars.slice(i, i + 3).join("");
      const ch = chars[i];
      const consonant = DEVANAGARI_CONSONANTS[tri] ? tri : (DEVANAGARI_CONSONANTS[ch] ? ch : null);
      if (consonant) {
        out += DEVANAGARI_CONSONANTS[consonant];
        i += consonant.length - 1;
        const next = chars[i + 1];
        if (next && DEVANAGARI_MATRAS[next]) { out += DEVANAGARI_MATRAS[next]; i++; }
        else if (next === VIRAMA) { i++; }
        else { out += "a"; }
        continue;
      }
      if (DEVANAGARI_VOWELS[ch]) { out += DEVANAGARI_VOWELS[ch]; continue; }
      if (DEVANAGARI_DIGITS[ch]) { out += DEVANAGARI_DIGITS[ch]; continue; }
      if (DEVANAGARI_MATRAS[ch] || ch === VIRAMA) continue; // stray, skip
      out += ch; // Latin letters, digits, spaces, punctuation pass through
    }
    return out;
  }

  function slugify(str) {
    return transliterateHindi(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function toParagraphHtml(plainText) {
    return plainText
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function fromParagraphHtml(html) {
    if (!html) return "";
    return html
      .replace(/<\/p>\s*<p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?p>/gi, "")
      .trim();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------------- login page ----------------

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("loginError");
      const submitBtn = document.getElementById("loginSubmit");
      errorEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "लॉगिन हो रहा है…";
      try {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: document.getElementById("username").value,
            password: document.getElementById("password").value
          })
        });
        window.location.href = "/admin/dashboard";
      } catch (err) {
        errorEl.textContent = err.message === "अनधिकृत — कृपया दोबारा लॉगिन करें" ? "यूज़रनेम या पासवर्ड ग़लत है।" : err.message;
        errorEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "लॉगिन करें";
      }
    });
  }

  // ---------------- dashboard page ----------------

  const listView = document.getElementById("listView");
  if (!listView) return; // not on dashboard

  const editorView = document.getElementById("editorView");
  const articlesTableBody = document.getElementById("articlesTableBody");
  const listStatus = document.getElementById("listStatus");
  const editorForm = document.getElementById("articleForm");
  const editorError = document.getElementById("editorError");
  const editorStatus = document.getElementById("editorStatus");
  const editorTitle = document.getElementById("editorTitle");
  const deleteBtn = document.getElementById("deleteBtn");

  let categories = [];
  let articles = [];
  let editingId = null;
  let slugManuallyEdited = false;

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  });

  document.getElementById("newArticleBtn").addEventListener("click", () => openEditor(null));
  document.getElementById("backToListBtn").addEventListener("click", showList);

  document.getElementById("title").addEventListener("input", (e) => {
    if (!slugManuallyEdited) {
      document.getElementById("slug").value = slugify(e.target.value);
    }
  });
  document.getElementById("slug").addEventListener("input", () => { slugManuallyEdited = true; });

  document.getElementById("imageInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const errorEl = editorError;
    errorEl.hidden = true;
    try {
      const base64 = await fileToBase64(file);
      const result = await api("/api/media/upload", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentType: file.type, base64 })
      });
      document.getElementById("featuredImage").value = result.url;
      document.getElementById("imagePreview").src = result.url;
      document.getElementById("imagePreviewWrap").hidden = false;
    } catch (err) {
      errorEl.textContent = "तस्वीर अपलोड नहीं हो सकी: " + err.message;
      errorEl.hidden = false;
    }
  });

  document.getElementById("featuredImageManual").addEventListener("input", (e) => {
    const path = e.target.value.trim();
    document.getElementById("featuredImage").value = path;
    const preview = document.getElementById("imagePreview");
    const previewWrap = document.getElementById("imagePreviewWrap");
    if (path) {
      preview.src = path;
      previewWrap.hidden = false;
    } else {
      previewWrap.hidden = true;
    }
  });

  document.getElementById("removeImageBtn").addEventListener("click", () => {
    document.getElementById("featuredImage").value = "";
    document.getElementById("featuredImageManual").value = "";
    document.getElementById("imagePreviewWrap").hidden = true;
    document.getElementById("imageInput").value = "";
  });

  deleteBtn.addEventListener("click", async () => {
    if (!editingId) return;
    if (!confirm("क्या आप वाकई इस लेख को हटाना चाहते हैं? यह वापस नहीं लिया जा सकता।")) return;
    deleteBtn.disabled = true;
    try {
      await api(`/api/articles/${editingId}`, { method: "DELETE" });
      await loadArticles();
      showList();
    } catch (err) {
      editorError.textContent = err.message;
      editorError.hidden = false;
      deleteBtn.disabled = false;
    }
  });

  editorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editorError.hidden = true;
    editorStatus.hidden = true;
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "सेव हो रहा है…";

    const payload = {
      title: document.getElementById("title").value.trim(),
      slug: document.getElementById("slug").value.trim(),
      category: document.getElementById("category").value,
      excerpt: document.getElementById("excerpt").value.trim(),
      contentHtml: toParagraphHtml(document.getElementById("content").value),
      featuredImage: document.getElementById("featuredImage").value || null,
      metaTitle: document.getElementById("metaTitle").value.trim() || null,
      metaDescription: document.getElementById("metaDescription").value.trim() || null,
      status: document.getElementById("status").value
    };

    if (!/^[a-z0-9-]+$/.test(payload.slug)) {
      editorError.textContent = "स्लग में केवल छोटे अक्षर, संख्याएँ और हाइफ़न (-) मान्य हैं, स्पेस नहीं।";
      editorError.hidden = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "सेव करें";
      return;
    }

    try {
      if (editingId) {
        await api(`/api/articles/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/articles", { method: "POST", body: JSON.stringify(payload) });
      }
      editorStatus.textContent = "सेव हो गया — साइट कुछ ही सेकंड में अपडेट हो जाएगी।";
      editorStatus.hidden = false;
      await loadArticles();
    } catch (err) {
      editorError.textContent = err.message;
      editorError.hidden = false;
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "सेव करें";
    }
  });

  function showList() {
    editorView.hidden = true;
    listView.hidden = false;
  }

  function openEditor(article) {
    editingId = article ? article.id : null;
    slugManuallyEdited = !!article;
    editorError.hidden = true;
    editorStatus.hidden = true;
    editorTitle.textContent = article ? "लेख संपादित करें" : "नया लेख";
    deleteBtn.hidden = !article;
    deleteBtn.disabled = false;

    document.getElementById("articleId").value = article ? article.id : "";
    document.getElementById("title").value = article ? article.title : "";
    document.getElementById("slug").value = article ? article.slug : "";
    document.getElementById("excerpt").value = article ? article.excerpt : "";
    document.getElementById("content").value = article ? fromParagraphHtml(article.contentHtml) : "";
    document.getElementById("featuredImage").value = (article && article.featuredImage) || "";
    document.getElementById("featuredImageManual").value = (article && article.featuredImage) || "";
    document.getElementById("metaTitle").value = (article && article.metaTitle) || "";
    document.getElementById("metaDescription").value = (article && article.metaDescription) || "";
    document.getElementById("status").value = article ? article.status : "draft";

    const preview = document.getElementById("imagePreview");
    const previewWrap = document.getElementById("imagePreviewWrap");
    if (article && article.featuredImage) {
      preview.src = article.featuredImage;
      previewWrap.hidden = false;
    } else {
      previewWrap.hidden = true;
    }

    listView.hidden = true;
    editorView.hidden = false;
  }

  function renderCategoryOptions() {
    const select = document.getElementById("category");
    select.innerHTML = categories.map((c) => `<option value="${c.slug}">${c.name}</option>`).join("");
  }

  function categoryName(slug) {
    const c = categories.find((c) => c.slug === slug);
    return c ? c.name : slug;
  }

  function renderTable() {
    if (articles.length === 0) {
      articlesTableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">अभी कोई लेख नहीं है — "नया लेख" पर क्लिक करें।</td></tr>`;
      return;
    }
    const sorted = [...articles].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    articlesTableBody.innerHTML = sorted
      .map(
        (a) => `<tr>
          <td class="row-title" data-id="${a.id}">${escapeHtml(a.title)}</td>
          <td>${escapeHtml(categoryName(a.category))}</td>
          <td><span class="status-pill status-pill--${a.status}">${a.status === "published" ? "प्रकाशित" : "ड्राफ़्ट"}</span></td>
          <td>${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("hi-IN") : "—"}</td>
          <td><div class="row-actions"><button type="button" data-id="${a.id}" class="edit-link">संपादित करें</button></div></td>
        </tr>`
      )
      .join("");

    articlesTableBody.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const article = articles.find((a) => a.id === el.dataset.id);
        if (article) openEditor(article);
      });
    });
  }

  async function loadArticles() {
    const data = await api("/api/articles");
    articles = data.articles || [];
    renderTable();
  }

  async function init() {
    try {
      const catData = await api("/api/categories");
      categories = catData.categories || [];
      renderCategoryOptions();
      await loadArticles();
    } catch (err) {
      listStatus.textContent = err.message;
      listStatus.hidden = false;
    }
  }

  init();
})();
