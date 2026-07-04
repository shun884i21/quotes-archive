// 偉人の格言アーカイブ — フロントエンドロジック
(function () {
  "use strict";

  const FAV_KEY = "quote-archive-favorites";
  const PAGE = 20; // 一度に表示する件数
  let quotes = [];
  let favorites = loadFavorites();
  let currentTab = "all";
  let query = "";
  let activeTag = null;
  let visibleLimit = PAGE;

  const el = {
    today: document.getElementById("today-card"),
    list: document.getElementById("list"),
    search: document.getElementById("search-input"),
    searchWrap: document.getElementById("search-wrap"),
    count: document.getElementById("result-count"),
    tabs: document.getElementById("tabs"),
    tagBar: document.getElementById("tag-bar"),
    toTop: document.getElementById("to-top"),
    updatedAt: document.getElementById("updated-at"),
    overlay: document.getElementById("modal-overlay"),
    modalBody: document.getElementById("modal-body"),
    modalClose: document.getElementById("modal-close"),
  };

  // ---- 起動 ----
  fetch("quotes.json?_=" + Date.now())
    .then((r) => r.json())
    .then((data) => {
      quotes = data.quotes || [];
      if (data.updatedAt) {
        el.updatedAt.textContent =
          "最終更新: " + new Date(data.updatedAt).toLocaleString("ja-JP");
      }
      renderToday();
      buildTagBar();
      render();
    })
    .catch((err) => {
      el.today.textContent = "格言の読み込みに失敗しました。";
      console.error(err);
    });

  // ---- 今日の格言 ----
  function renderToday() {
    if (!quotes.length) return;
    const todayStr = localDateStr(new Date());
    // 朝のタスクが featuredDate を付けたものを優先
    let q = quotes.find((x) => x.featuredDate === todayStr);
    // なければ日付シードで決定的に1本選ぶ（毎日変わる）
    if (!q) {
      const seed = hashStr(todayStr);
      q = quotes[seed % quotes.length];
    }
    const now = new Date();
    const youbi = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    const dateLabel = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${youbi}）`;
    el.today.innerHTML = `
      <div class="q-date">${dateLabel}</div>
      <div class="q-text">${esc(q.text)}</div>
      ${q.original ? `<div class="q-original">${esc(q.original)}</div>` : ""}
      <div class="q-author">${esc(q.author)}</div>
    `;
    el.today.onclick = () => openModal(q);
    el.today.style.cursor = "pointer";
  }

  // ---- タブ ----
  el.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    currentTab = btn.dataset.tab;
    el.tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
    visibleLimit = PAGE;
    render();
  });

  // ---- 検索 ----
  el.search.addEventListener("input", (e) => {
    query = e.target.value.trim().toLowerCase();
    visibleLimit = PAGE;
    render();
  });

  // ---- タグ絞り込み ----
  function buildTagBar() {
    const freq = {};
    quotes.forEach((q) => (q.tags || []).forEach((t) => { freq[t] = (freq[t] || 0) + 1; }));
    const top = Object.keys(freq)
      .sort((a, b) => freq[b] - freq[a] || a.localeCompare(b, "ja"))
      .slice(0, 12);
    el.tagBar.innerHTML = top
      .map((t) => `<button class="tag-chip" data-tag="${esc(t)}">${esc(t)} <span class="tag-n">${freq[t]}</span></button>`)
      .join("");
  }

  function setTag(tag) {
    activeTag = activeTag === tag ? null : tag; // 同じタグ再タップで解除
    visibleLimit = PAGE;
    syncTagBar();
    render();
  }

  function syncTagBar() {
    el.tagBar.querySelectorAll(".tag-chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.tag === activeTag)
    );
  }

  el.tagBar.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-chip");
    if (chip) setTag(chip.dataset.tag);
  });

  // ---- トップへ戻る ----
  window.addEventListener("scroll", () => {
    el.toTop.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });
  el.toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ---- 一覧描画 ----
  function render() {
    let items = quotes.slice();

    if (currentTab === "favorites") {
      items = items.filter((q) => favorites.includes(q.id));
    }

    if (activeTag) {
      items = items.filter((q) => (q.tags || []).includes(activeTag));
    }

    if (query) {
      items = items.filter((q) => matches(q, query));
    }

    if (!items.length) {
      el.list.innerHTML = `<div class="empty">${
        currentTab === "favorites" && !query && !activeTag
          ? "お気に入りはまだありません。格言の☆を押すと登録できます。"
          : "該当する格言が見つかりませんでした。"
      }</div>`;
      el.count.textContent = "";
      return;
    }

    el.count.textContent = activeTag ? `「${activeTag}」 ${items.length} 件` : `${items.length} 件`;

    const shown = items.slice(0, visibleLimit);
    const rest = items.length - shown.length;

    let html;
    if (currentTab === "authors") {
      html = renderByAuthor(shown);
    } else {
      html = shown.map(cardHtml).join("");
    }
    if (rest > 0) {
      html += `<button class="load-more" id="load-more">もっと見る（残り ${rest} 件）</button>`;
    }
    el.list.innerHTML = html;
    bindCards();

    const more = document.getElementById("load-more");
    if (more) {
      more.addEventListener("click", () => {
        visibleLimit += PAGE;
        render();
      });
    }
  }

  function renderByAuthor(items) {
    const groups = {};
    items.forEach((q) => {
      (groups[q.author] = groups[q.author] || []).push(q);
    });
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .map(
        (author) =>
          `<div class="author-group"><h3>${esc(author)}（${groups[author].length}）</h3>` +
          groups[author].map(cardHtml).join("") +
          `</div>`
      )
      .join("");
  }

  function cardHtml(q) {
    const isFav = favorites.includes(q.id);
    const tags = (q.tags || []).map((t) => `<span class="tag tag-click" data-tag="${esc(t)}">${esc(t)}</span>`).join("");
    return `
      <div class="card" data-id="${q.id}">
        <div class="q-text">${esc(q.text)}</div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="q-meta">
          <span class="q-author">${esc(q.author)}</span>
          <span style="display:flex;align-items:center;gap:8px;">
            ${q.uncertain ? `<span class="badge-uncertain">諸説あり</span>` : ""}
            <button class="fav-btn ${isFav ? "active" : ""}" data-fav="${q.id}" aria-label="お気に入り">${isFav ? "★" : "☆"}</button>
          </span>
        </div>
      </div>`;
  }

  function bindCards() {
    el.list.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".fav-btn")) return;
        const tagEl = e.target.closest(".tag-click");
        if (tagEl) { setTag(tagEl.dataset.tag); return; }
        const q = quotes.find((x) => x.id === card.dataset.id);
        if (q) openModal(q);
      });
    });
    el.list.querySelectorAll(".fav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFav(btn.dataset.fav);
      });
    });
  }

  // ---- お気に入り ----
  function toggleFav(id) {
    const i = favorites.indexOf(id);
    if (i >= 0) favorites.splice(i, 1);
    else favorites.push(id);
    saveFavorites();
    render();
  }
  function loadFavorites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveFavorites() {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }

  // ---- モーダル ----
  function openModal(q) {
    const isFav = favorites.includes(q.id);
    const tags = (q.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    el.modalBody.innerHTML = `
      <div class="m-text">${esc(q.text)}</div>
      ${q.original ? `<div class="m-original">${esc(q.original)}</div>` : ""}
      <div class="m-author">${esc(q.author)} ${q.uncertain ? `<span class="badge-uncertain">諸説あり</span>` : ""}</div>
      ${q.authorBio ? `<div class="m-section"><h4>人物像</h4><p>${esc(q.authorBio)}</p></div>` : ""}
      ${q.background ? `<div class="m-section"><h4>この言葉の背景</h4><p>${esc(q.background)}</p></div>` : ""}
      ${tags ? `<div class="m-tags">${tags}</div>` : ""}
      <div class="m-foot">
        ${q.source ? `<div class="m-source">出典: <a href="${esc(q.source)}" target="_blank" rel="noopener">${sourceLabel(q.source)}</a></div>` : "<span></span>"}
        <button class="fav-btn ${isFav ? "active" : ""}" data-fav="${q.id}">${isFav ? "★ お気に入り" : "☆ お気に入り"}</button>
      </div>`;
    el.overlay.classList.remove("hidden");
    el.modalBody.querySelector(".fav-btn").addEventListener("click", (e) => {
      toggleFav(q.id);
      openModal(q); // 再描画
    });
  }
  function closeModal() { el.overlay.classList.add("hidden"); }
  el.modalClose.addEventListener("click", closeModal);
  el.overlay.addEventListener("click", (e) => { if (e.target === el.overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // ---- 検索マッチ ----
  function matches(q, term) {
    const hay = [q.text, q.original, q.author, q.authorBio, q.background, (q.tags || []).join(" ")]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.includes(term);
  }

  // ---- ユーティリティ ----
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function sourceLabel(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return url; }
  }
  function localDateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }

  // ---- Service Worker ----
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
