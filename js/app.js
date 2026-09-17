const ICONS = {
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  flag:'<path d="M5 3v18"/><path d="M5 4h13l-3 4 3 4H5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  crystal:'<path d="M12 2l7 6-2.5 12h-9L5 8z"/>',
  bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  org:'<circle cx="12" cy="6" r="2.4"/><circle cx="6" cy="17" r="2.4"/><circle cx="18" cy="17" r="2.4"/><path d="M12 8.4V13M8 15.6l2.2-2M16 15.6l-2.2-2"/>',
  creature:'<path d="M12 3c4 0 7 3 7 8s-3 9-7 9-7-4-7-9 3-8 7-8z"/><circle cx="9.5" cy="10" r="0.8" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="0.8" fill="currentColor" stroke="none"/>',
  shrine:'<path d="M4 21V10l8-6 8 6v11"/><path d="M2 10h20"/><path d="M9 21v-7h6v7"/>',
  person:'<circle cx="12" cy="8" r="3.6"/><path d="M5 21c0-4 3-6.5 7-6.5S19 17 19 21"/>',
  book:'<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  leaf:'<path d="M4 20c8 0 14-6 14-14 0 0-10 0-14 6-3 4-2 8 0 8z"/><path d="M4 20c0-4 2-8 6-10"/>',
  scale:'<path d="M12 3v18M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
};

let isAdmin = sessionStorage.getItem('moonCoreAdmin') === 'true';

function catByKey(key){ return CATEGORIES.find(c => c.key === key); }

function setBackgroundTheme(theme){
  const themes = [
    "theme-world",
    "theme-history",
    "theme-life",
    "theme-tech",
    "theme-substance",
    "theme-nation",
    "theme-creature",
    "theme-org",
    "theme-mutant",
    "theme-culture",
    "theme-law",
    "theme-glossary"
  ];

  document.body.classList.remove(...themes);

  if(theme){
    document.body.classList.add("theme-" + theme);
  }
}

function articleById(id){ return ARTICLES.find(a => a.id === id); }

/* ---------------- 関連記事の自動補完 ----------------
   related が空・不足していても、記事ページには関連記事を表示する。
   既存relatedを最優先し、本文中のタイトル参照→同一カテゴリの共通語→
   最終フォールバックの順で補完する。 */
function autoRelatedIds(article){
  const existing = new Set((article.related || []).filter(id => !!articleById(id)));
  const textOf = a => {
    let text = `${a.title || ''} ${a.lede || ''}`;
    (a.sections || []).forEach(s => {
      text += ` ${s.title || ''}`;
      (s.blocks || []).forEach(b => {
        if(b.text) text += ` ${b.text}`;
        if(b.items) b.items.forEach(it => {
          text += ` ${[it.label,it.value,it.name,it.desc,it.role].filter(Boolean).join(' ')}`;
        });
      });
    });
    return text;
  };

  const text = textOf(article);
  const scored = [];

  ARTICLES.forEach(o => {
    if(o.id === article.id || existing.has(o.id) || !o.title || o.title.length < 2) return;
    const occ = text.split(o.title).length - 1;
    if(occ > 0){
      let score = occ * 2;
      if(o.cat === article.cat) score += 1;
      if(textOf(o).split(article.title).length - 1 > 0) score += 3;
      scored.push({id:o.id, score});
    }
  });

  let candidates = scored
    .sort((a,b) => b.score - a.score)
    .map(x => x.id);

  // 明示的なタイトル参照が無い場合は、同一カテゴリ内の共通語で補完
  if(candidates.length === 0){
    const tokens = s => [...new Set(
      (s || '').match(/[一-龯々〆ヵヶ]{2,}|[ぁ-んァ-ヶー]{3,}|[A-Za-z]{3,}/g) || []
    )];
    const aTokens = tokens(text);

    candidates = ARTICLES
      .filter(o => o.id !== article.id && !existing.has(o.id) && o.cat === article.cat)
      .map(o => {
        const oText = textOf(o);
        const overlap = aTokens.filter(t => oText.includes(t)).length;
        return {id:o.id, score:overlap};
      })
      .sort((a,b) => b.score - a.score || articleById(a.id).title.localeCompare(articleById(b.id).title,'ja'))
      .map(x => x.id);
  }

  return [...existing, ...candidates].slice(0, 4);
}
function articlesInCat(key){ return ARTICLES.filter(a => a.cat === key); }
function iconSvg(key, cls){ return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]||''}</svg>`; }

function navLinkFor(c){
  return `<a href="#/category/${c.key}" style="--nav-color:${c.color};">${c.name}</a>`;
}

function renderNav(){

  // ヘッダーに常時表示する主要カテゴリー
  const main = [
    'world',
    'history',
    'tech',
    'mutant',
    'nation'
  ];

  // その他に入れるカテゴリー
  const others = [
  'life',
  'substance',
  'creature',
  'org',
  'culture',
  'law',
  'glossary'
];

  const nav =
    main.map(k => navLinkFor(catByKey(k))).join('') +

    `
      <div class="nav-dropdown">
        <button
  type="button"
  class="nav-dropdown-btn"
  onclick="toggleNavDropdown(event)"
>
  その他
  <svg viewBox="0 0 24 24" fill="none"
       stroke="currentColor"
       stroke-width="2"
       stroke-linecap="round"
       stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
</button>

        <div class="nav-dropdown-menu">
          ${others.map(k => navLinkFor(catByKey(k))).join('')}
        </div>
      </div>

      <a href="#/articles">
        全記事一覧
      </a>
    `;

  document.getElementById('main-nav').innerHTML = nav;
}
function toggleNavDropdown(event){
  event.stopPropagation();

  const dropdown = event.currentTarget.parentElement;
  dropdown.classList.toggle('open');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.nav-dropdown.open')
    .forEach(el => el.classList.remove('open'));
});

function relatedChip(ref){
  const a = articleById(ref);
  if(a){ return `<a class="related-chip" href="#/article/${a.id}">${a.title}</a>`; }
  return `<span class="related-chip" onclick="toastMsg('「${ref}」— 詳細ページは準備中です')">${ref}</span>`;
}

function renderBlocks(blocks){
  return blocks.map(b => {
    if(b.t === 'p') return `<p>${b.text}</p>`;
    if(b.t === 'h3') return `<h3>${b.text}</h3>`;
    if(b.t === 'quote') return `<blockquote class="${b.warn?'warn':''}">${b.text}</blockquote>`;
    if(b.t === 'list') return `<ul>${b.items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
    if(b.t === 'info') return `<div class="info-card-row">${b.items.map(i=>`<div class="info-card"><div class="info-card-label">${i.label}</div><div class="info-card-value">${i.value}</div></div>`).join('')}</div>`;
    if(b.t === 'cities') return `<div class="city-grid">${b.items.map(c=>`<div class="city-card"><div class="city-card-name">${c.name}</div><div class="city-card-role">${c.role}</div><div class="city-card-desc">${c.desc}</div></div>`).join('')}</div>`;
    if(b.t === 'facilities') return `${b.items.map(fc=>`<div class="facility-item"><div class="facility-name">${fc.name}</div><div class="facility-desc">${fc.desc}</div></div>`).join('')}`;
    if(b.t === 'table')
  return `
    <div class="table-wrap">
      <table class="archive-table">
        <thead>
          <tr>
            ${b.headers.map(h=>`<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${b.rows.map(r=>`
            <tr>
              ${r.map(c=>`<td>${c}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
    return '';
  }).join('');
}

/* ---------------- ホーム ---------------- */
function renderHome(){

  setBackgroundTheme(null);

  document.getElementById('home-hero').style.display = 'block';
  const grid = CATEGORIES.map(c => {
  const count =
    c.renderMode === 'glossary'
      ? GLOSSARY.length
      : (c.renderMode === 'timeline'
          ? TIMELINE.length
          : articlesInCat(c.key).length);

  return `
    <a class="cat-card theme-${c.key}" href="#/category/${c.key}">
      <div class="cat-icon">${iconSvg(c.icon)}</div>
      <div class="cat-name">${c.name}</div>
      <div class="cat-desc">${c.desc}</div>
      <div class="cat-count">${count}項目</div>
    </a>`;
}).join('');

  const recent = [...ARTICLES]
  .sort((a, b) => new Date(b.updated) - new Date(a.updated))
  .slice(0, 6)
  .map(a => `
    <a class="update-row" href="#/article/${a.id}">
      <span class="update-date">${a.updated}</span>
      <span class="update-name">${a.title}</span>
      <span class="update-cat">${catByKey(a.cat).name}</span>
    </a>
  `).join('');

  document.getElementById('app').innerHTML = `
    <section class="section">
      <div class="section-inner">
        <div class="section-head">
          <div>
            <div class="section-title">カテゴリー</div>
            <div class="section-sub">CATEGORIES — ${CATEGORIES.length} SECTIONS</div>
          </div>
        </div>
        <div class="category-grid" id="category-grid">${grid}</div>
      </div>
    </section>
    <section class="section" style="padding-top:0;">
      <div class="section-inner">
        <div class="section-head">
          <div>
            <div class="section-title">最近更新された項目</div>
            <div class="section-sub">RECENTLY UPDATED</div>
          </div>
        </div>
        <div class="update-list">${recent}</div>
      </div>
    </section>`;
  initCardObserver();
}

/* ---------------- カテゴリーページ ---------------- */
function renderCategoryPage(key){

  setBackgroundTheme(key);

  const c = catByKey(key);

  if(!c){
    renderHome();
    return;
  }

  // 背景アイコンを切り替え
  const bg = document.getElementById("bg-icon");
  if(bg){
    bg.innerHTML = iconSvg(c.icon);
  }

  document.getElementById("home-hero").style.display = "none";

  let body = "";
  const note = c.note ? `<div class="cat-note">${c.note}</div>` : "";

  if(c.renderMode === "glossary"){

    body = `
      <div class="glossary-list">
        ${GLOSSARY.map(g=>`
          <div class="glossary-item">

            <div class="glossary-term"
              onclick="${
                g.articleId
                ? `location.hash='#/article/${g.articleId}'`
                : `toastMsg('「${g.term}」— 詳細ページは準備中です')`
              }">

              ${g.term}

              ${
                g.articleId
                ? `<span class="glossary-link-icon">記事を見る</span>`
                : ""
              }

            </div>

            <div class="glossary-def">
              ${g.def}
            </div>

          </div>
        `).join("")}
      </div>
    `;

    }else if(c.renderMode==="nation"){

    const arts = ARTICLES.filter(a => a.cat === "nation");

    body = `
        ${note}

        <div class="category-actions nation-entry">
    <a class="btn btn-ghost nation-button" href="#/world-map">
        世界地図を見る
    </a>
</div>

        <div class="article-grid">

            ${arts.map(a=>`

                <a class="article-card${isAdmin && a.admin ? ' admin-article' : ''}" href="#/article/${a.id}">

                    <div class="article-card-title">
                        ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
                    </div>

                    <div class="article-card-lede">
                        ${a.lede}
                    </div>

                </a>

            `).join("")}

        </div>
    `;

}else if(c.renderMode==="history"){

    const arts = ARTICLES.filter(a=>a.cat==="history");

    body = `
        ${note}

        <div class="category-actions history-entry">
    <a class="btn btn-ghost" href="#/history/timeline">
        歴史年表を見る
    </a>
</div>


        <div class="article-grid">

            ${arts.map(a=>`

                <a class="article-card${isAdmin && a.admin ? ' admin-article' : ''}" href="#/article/${a.id}">

                    <div class="article-card-title">
                        ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
                    </div>

                    <div class="article-card-lede">
                        ${a.lede}
                    </div>

                </a>

            `).join("")}

        </div>
    `;

}else if(c.renderMode==="life"){

    const arts = ARTICLES.filter(
        a => a.cat === "life" && a.type !== "novel"
    );

    body = `
        ${note}

        <div class="category-actions life-entry">

  <a class="btn btn-ghost calendar-button" href="#/calendar">
    世界カレンダーを見る
  </a>

  <a class="btn btn-ghost calendar-button" href="#/news">
    世界ニュースを見る
  </a>

  <a class="btn btn-ghost" href="#/life/novels">
    小説・短編
  </a>

</div>

        <div class="article-grid">

            ${arts.map(a=>`

                <a class="article-card${isAdmin && a.admin ? ' admin-article' : ''}" href="#/article/${a.id}">

                    <div class="article-card-title">
                        ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
                    </div>

                    <div class="article-card-lede">
                        ${a.lede}
                    </div>

                </a>

            `).join("")}

        </div>
    `;

}else if(key === "creature"){

    const activeSubcat = creatureFilter;

    const subcats = [
      { key:"plant",  name:"植物" },
      { key:"animal", name:"動物" },
      { key:"marine", name:"海洋生物" }
    ];

    const filterButtons = `
      <div class="timeline-filter creature-filter">

        <div class="timeline-filter-title">
          生物カテゴリー
        </div>

        <div class="timeline-filter-list">

          ${subcats.map(sub => `
            <button
              class="btn btn-ghost timeline-filter-btn ${activeSubcat === sub.key ? "active" : ""}"
              onclick="setCreatureFilter('${sub.key}')"
            >
              ${sub.name}
            </button>
          `).join("")}

        </div>

      </div>
    `;

    const arts = ARTICLES.filter(a =>
      a.cat === "creature" &&
      a.subcat === activeSubcat
    );

    if(arts.length === 0){

      body = `
        ${note}

        ${filterButtons}

        <div class="empty-state">
          このカテゴリーにはまだ記事がありません。
        </div>
      `;

    }else{

      body = `
        ${note}

        ${filterButtons}

        <div class="article-grid">

          ${arts.map(a=>`

            <a class="article-card${isAdmin && a.admin ? ' admin-article' : ''}"
               href="#/article/${a.id}">

              <div class="article-card-title">
                ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
              </div>

              <div class="article-card-lede">
                ${a.lede}
              </div>

            </a>

          `).join("")}

        </div>
      `;

    }

  }else{

    const arts = articlesInCat(key);

    if(arts.length===0){

      body = `
        ${note}
        <div class="empty-state">
          この分類にはまだ記事がありません。<br>
          設定は今後追加される予定です。
        </div>
      `;

    }else{

      body = `
        ${note}

        <div class="article-grid">

          ${arts.map(a=>`

            <a class="article-card${isAdmin && a.admin ? ' admin-article' : ''}"
               href="#/article/${a.id}">

              <div class="article-card-title">
                ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
              </div>

              <div class="article-card-lede">
                ${a.lede}
              </div>

            </a>

          `).join("")}

        </div>
      `;

    }

  }

  

  document.getElementById("app").innerHTML = `

    <div class="page-header">

      <div class="breadcrumb">
        <a href="#/">MOON CORE</a>
        <span>/</span>
        <span style="color:var(--text-primary)">
          ${c.name}
        </span>
      </div>

      <div class="title-block fade-seq"
           style="border-bottom:none;padding-bottom:36px;">

        <span class="cat-badge">
          ${c.name} — CATEGORY
        </span>

        <h1 style="font-size:clamp(28px,4vw,42px);">
          ${c.name}
        </h1>

        <p class="lede">
          ${c.desc}
        </p>

      </div>

    </div>

    <div class="wrap"
         style="padding-top:8px;padding-bottom:100px;">

      ${body}

    </div>

  `;

}

function renderHistoryPage(title, subtitle, body, breadcrumbText){

  document.getElementById("app").innerHTML = `

    <div class="page-header">

      <div class="breadcrumb">
        <a href="#/">MOON CORE</a>
        <span>/</span>
        <a href="#/category/history">歴史</a>
        <span>/</span>
        <span>${breadcrumbText}</span>
      </div>

      <div class="title-block">
        <span class="cat-badge">HISTORY</span>
        <h1>${title}</h1>
        <p class="lede">
          ${subtitle}
        </p>
      </div>

    </div>

    <div class="wrap">
      ${body}
    </div>

  `;

}

function renderHistoryArticles(){

  setBackgroundTheme("history");
  document.getElementById("home-hero").style.display = "none";

  const arts = articlesInCat("history");

  const body = arts.length === 0
    ? `
      <div class="empty-state">
        歴史記事はまだありません。
      </div>
    `
    : `
      <div class="article-grid">

        ${arts.map(a=>`

          <a class="article-card${isAdmin && a.admin ? ' admin-article' : ''}"
             href="#/article/${a.id}">

            <div class="article-card-title">
              ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
            </div>

            <div class="article-card-lede">
              ${a.lede}
            </div>

          </a>

        `).join("")}

      </div>
    `;

  renderHistoryPage(
    "歴史記事",
    "世界史を詳しく解説した資料一覧です。",
    body,
    "歴史記事"
  );

}

/* ---------------- 小説・短編一覧 ---------------- */

function renderLifeNovels(){

  setBackgroundTheme("life");
  document.getElementById("home-hero").style.display = "none";

  /*
   * 小説・短編として登録した記事だけを表示
   * form:'novel' / form:'short' で「小説」「短編」を視覚的に区別する
   * （未指定のものは短編として扱う）
   */
  const novels = ARTICLES.filter(a => a.type === "novel");

  const body = novels.length === 0
    ? `
      <div class="empty-state">
        小説・短編はまだありません。
      </div>
    `
    : `
      <div class="story-grid">

        ${novels.map(a=>{
          const form = a.form === "novel" ? "novel" : "short";
          const formLabel = form === "novel" ? "小説" : "短編";
          return `

          <a class="story-card story-card--${form}${isAdmin && a.admin ? ' admin-article' : ''}"
             href="#/article/${a.id}">

            <span class="story-card__badge">
              ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${formLabel}
            </span>

            <div class="story-card__title">
              ${a.title}
            </div>

            <div class="story-card__lede">
              ${a.lede}
            </div>

            <div class="story-card__meta">
              更新：${a.updated}
            </div>

          </a>

        `;}).join("")}

      </div>
    `;

  document.getElementById("app").innerHTML = `

    <div class="page-header">

      <div class="breadcrumb">

        <a href="#/">MOON CORE</a>

        <span>/</span>

        <a href="#/category/life">人々の暮らし</a>

        <span>/</span>

        <span style="color:var(--text-primary)">
          小説・短編
        </span>

      </div>

      <div class="title-block fade-seq">

        <span class="cat-badge">
          SHORT STORIES
        </span>

        <h1>
          小説・短編
        </h1>

        <p class="lede">
          未来世界に暮らす人々の、日常や小さな出来事を描いた短編小説。
        </p>

      </div>

    </div>

    <div class="wrap" style="padding-top:8px;padding-bottom:100px;">

      ${body}

    </div>

  `;

}

/* ---------------- 世界地図 ---------------- */

function renderWorldMap(){

  setBackgroundTheme("nation");
  document.getElementById("home-hero").style.display = "none";

  const climateHtml = Object.keys(CLIMATE_DATA)
    .map(id => renderClimateCard(id))
    .join("");

  document.getElementById("app").innerHTML = `

    <div class="page-header">

      <div class="breadcrumb">
        <a href="#/">MOON CORE</a>
        <span>/</span>
        <span style="color:var(--text-primary)">
          世界地図
        </span>
      </div>

      <div class="title-block fade-seq">

        <span class="cat-badge">
          WORLD MAP
        </span>

        <h1>世界地図</h1>

        <p class="lede">
          未来世界における各国家の位置関係を確認できます。
        </p>

      </div>

    </div>

    <div class="wrap world-map-wrap">

      <div class="world-map-card">

        <img
          src="assets/world-map.svg"
          alt="未来世界 世界地図"
          class="world-map-image"
        >

      </div>

      <div class="world-map-note">

        <div class="world-map-note-title">
          WORLD MAP
        </div>

        <p>
          地図上の国家名や地域については、
          各国家の資料ページから詳しく確認できます。
        </p>

      </div>

      ${climateHtml}

    </div>

  `;

}

function renderHistoryTimeline(){

  setBackgroundTheme("history");
  document.getElementById("home-hero").style.display = "none";

  /*
   * 現在選択されている年表カテゴリー
   * "all" = すべて
   */
  const activeTag =
    window.historyTimelineFilter || "all";

  /*
   * TIMELINE に登録されているカテゴリーを自動取得
   *
   * 手動でカテゴリー名を追加する必要はありません。
   */
  const tags = [
    ...new Set(
      TIMELINE
        .map(ev => ev.tag)
        .filter(Boolean)
    )
  ];

  /*
   * フィルター用ボタン
   */
 const filterButtons = `
  <div class="timeline-filter">

    <div class="timeline-filter-title">
      年表カテゴリー
    </div>

    <div class="timeline-filter-list">

      <button
        class="btn btn-ghost timeline-filter-btn ${activeTag === "all" ? "active" : ""}"
        onclick="setHistoryTimelineFilter('all')"
      >
        すべて
      </button>

      ${tags.map(tag => `
        <button
          class="btn btn-ghost timeline-filter-btn ${activeTag === tag ? "active" : ""}"
          onclick="setHistoryTimelineFilter('${tag}')"
        >
          ${tag}
        </button>
      `).join("")}

    </div>

  </div>
`;

  /*
   * 選択されたカテゴリーで年表を絞り込む
   */
  const filteredTimeline =
    activeTag === "all"
      ? TIMELINE
      : TIMELINE.filter(ev => ev.tag === activeTag);

  let body = "";

  if(filteredTimeline.length === 0){

    body = `
      ${filterButtons}

      <div class="empty-state">
        このカテゴリーの年表項目はまだありません。
      </div>
    `;

  }else{

    body = `
      ${filterButtons}

      <div class="timeline-list">

        ${filteredTimeline.map(ev=>`

          <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">

              <div class="timeline-era">
                ${ev.era}
                ${ev.tag
                  ? `<span class="timeline-tag">${ev.tag}</span>`
                  : ""}
              </div>

              <div class="timeline-title">
                ${ev.title}
              </div>

              <div class="timeline-desc">
                ${ev.desc}
              </div>

            </div>

          </div>

        `).join("")}

      </div>
    `;
  }

  renderHistoryPage(
    "歴史年表",
    "統合暦の出来事を年代順に閲覧できます。",
    body,
    "歴史年表"
  );

}


/* ---------------- 歴史年表 カテゴリーフィルター ---------------- */

function setHistoryTimelineFilter(tag){

  /*
   * 選択中のカテゴリーを保存
   */
  window.historyTimelineFilter = tag;

  /*
   * 年表を再描画
   */
  renderHistoryTimeline();

}

/* ---------------- 生物カテゴリー フィルター ---------------- */

let creatureFilter = 'plant';

function setCreatureFilter(subcat){

  creatureFilter = subcat;

  renderCategoryPage("creature");


}
/* ---------------- 全記事一覧 ---------------- */

let articleIndexSort = 'updated';

/* ---------------- 全記事一覧 データ統合 ---------------- */
// ARTICLES と NEWS_ITEMS を統合し、全記事一覧で扱える共通の形に正規化する
function buildArticleIndexList(){

  const fromArticles = ARTICLES.map(a => ({
    id: a.id,
    title: a.title,
    lede: a.lede || "詳細情報は資料ページを参照してください。",
    updated: a.updated,
    href: `#/article/${a.id}`,
    themeKey: a.cat,
    catLabel: catByKey(a.cat).name,
    admin: !!a.admin,
  }));

  const fromNews = (typeof NEWS_ITEMS !== 'undefined' ? NEWS_ITEMS : []).map(n => ({
    id: n.id,
    title: n.title,
    lede: n.text,
    updated: n.updated,
    href: `#/news/${n.id}`,
    themeKey: 'news',
    catLabel: 'ニュース',
    admin: false,
  }));

  return fromArticles.concat(fromNews);
}

function renderAllArticles(){

  setBackgroundTheme(null);
  document.getElementById("home-hero").style.display = "none";


let list = buildArticleIndexList();


if(articleIndexSort === 'updated'){

  list.sort((a,b)=>
    b.updated.localeCompare(a.updated)
  );

}else if(articleIndexSort === 'title'){

  list.sort((a,b)=>
    a.title.localeCompare(b.title,"ja")
  );

}else if(articleIndexSort === 'category'){

  list.sort((a,b)=>
    a.catLabel.localeCompare(b.catLabel,"ja")
  );

}


  const rows = list.map(a=>`

    <a class="article-index-card theme-${a.themeKey}${isAdmin && a.admin ? ' admin-article' : ''}"
   href="${a.href}">

      <div class="article-index-main">

        <div class="article-index-title">
          ${isAdmin && a.admin ? '<span class="admin-article-label">ADMIN</span>' : ''}${a.title}
        </div>

        <div class="article-index-lede">
          ${a.lede}
        </div>

      </div>


      <div class="article-index-meta">

        <span class="article-index-cat">
          ${a.catLabel}
        </span>

        <span class="article-index-date">
          ${a.updated}
        </span>

      </div>

    </a>

  `).join("");



  document.getElementById("app").innerHTML = `

    <div class="page-header">

      <div class="breadcrumb">

        <a href="#/">MOON CORE</a>

        <span>/</span>

        <span style="color:var(--text-primary)">
          全記事一覧
        </span>

      </div>


      <div class="title-block fade-seq">

        <span class="cat-badge">
          ARTICLE INDEX
        </span>


        <h1>
          全記事一覧
        </h1>


        <p class="lede">

  MOON COREに登録されている
  すべての記事一覧です。<br>

  現在登録資料：
  <strong>${list.length}項目</strong>

</p>


<div class="index-sort">

  <button
    class="btn btn-ghost ${articleIndexSort === 'updated' ? 'active' : ''}"
    onclick="setArticleSort('updated')"
  >
    更新順
  </button>

  <button
    class="btn btn-ghost ${articleIndexSort === 'title' ? 'active' : ''}"
    onclick="setArticleSort('title')"
  >
    名前順
  </button>

  <button
    class="btn btn-ghost ${articleIndexSort === 'category' ? 'active' : ''}"
    onclick="setArticleSort('category')"
  >
    カテゴリ順
  </button>

</div>

    </div>




    <div class="wrap article-index-wrap">

      <div class="article-index-list">

        ${rows}

      </div>

    </div>

  `;

}

/* ---------------- 全記事一覧 並び替え ---------------- */

function setArticleSort(type){

  articleIndexSort = type;

  renderAllArticles();

}

/* ---------------- 記事ページ ---------------- */
function renderArticlePage(id){

  const a = articleById(id);

  if(a){
    setBackgroundTheme(a.cat);
  }
  document.getElementById('home-hero').style.display = 'none';
  if(!a){ renderHome(); return; }

  // 背景テーマを切り替える
  CATEGORIES.forEach(c => {
    document.body.classList.remove("theme-" + c.key);
  });

  document.body.classList.add("theme-" + a.cat);

  const c = catByKey(a.cat);

const toc = a.sections.map(s => `<a href="#${s.id}">${s.title}</a>`).join('');
const miniCats = CATEGORIES.map(cc => `<a href="#/category/${cc.key}" class="${cc.key===a.cat?'active':''}">${cc.name}</a>`).join('');
const sectionsHtml = a.sections.map(s => `<h2 id="${s.id}">${s.title}</h2>${renderBlocks(s.blocks)}`).join('');

const adminSectionsHtml = isAdmin && a.admin?.sections
  ? `<div class="admin-section-block">
       <span class="admin-section-badge">ADMIN — 管理者用設定</span>
       ${a.admin.sections.map(s =>
         `<h2 id="${s.id}">${s.title}</h2>${renderBlocks(s.blocks)}`
       ).join('')}
     </div>`
  : '';

// related が無い・不足している記事でも、自動補完して関連記事を表示する。
const validRelated = autoRelatedIds(a);
const related = validRelated.map(relatedChip).join('');


  const isNation = a.cat === 'nation';
  const accentStyle = isNation && a.accentColor ? ` style="--nation-accent:${a.accentColor};background:${a.accentColor}11;"` : '';
  const flagHtml = isNation ? `<div class="flag-box">${a.flagUrl ? `<img src="${a.flagUrl}" alt="${a.title}の国旗" onerror="this.parentElement.innerHTML='国旗&lt;br&gt;（未設定）'">` : '国旗<br>（未設定）'}</div>` : '';
  const imageHtml = a.image ? `<div class="article-hero-image-wrap"><img class="article-hero-image" src="${a.image}" alt="${a.title}" onerror="this.parentElement.style.display='none'"></div>` : '';

const creatureImageHtml = a.imageUrl ? `<div class="creature-icon-wrap"><img class="creature-icon-image" src="${a.imageUrl}" alt="${a.title}" onerror="this.parentElement.style.display='none'"></div>` : '';

  document.getElementById('app').innerHTML = `
    <div class="page-header ${isNation?'nation-page':''}"${accentStyle}>
      ${isNation ? '<div class="nation-banner-strip"></div>' : ''}
      <div class="breadcrumb">
        <a href="#/">MOON CORE</a><span>/</span>
        <a href="#/category/${c.key}">${c.name}</a><span>/</span>
        <span style="color:var(--text-primary)">${a.title}</span>
      </div>
      <div class="title-block fade-seq">
        ${isNation ? `<div class="nation-header-row">${flagHtml}<div>` : ''}
        <span class="cat-badge">${c.name}</span>
        <h1>${a.title}</h1>
        <p class="lede">${a.lede}</p>
        <div class="meta-row"><span>更新日：文明統合暦 ${a.updated}</span><span>カテゴリ：${c.name}</span></div>
        ${isNation ? `</div></div>` : ''}
      </div>
      ${isNation ? '' : creatureImageHtml}
${imageHtml}
    </div>
    <div class="body-wrap ${isNation?'nation-page':''}"${accentStyle}>
      <aside class="sidebar">
        <div><div class="side-block-title">目次</div><nav class="toc-list" id="toc-list">${toc}</nav></div>
        <div><div class="side-block-title">カテゴリー</div><nav class="mini-cat-list">${miniCats}</nav></div>
        <div><div class="side-block-title">資料集を探す</div>
          <div class="btn btn-ghost" style="width:100%; justify-content:center;" onclick="openSearch()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.4" y2="16.4"/></svg>
            検索する
          </div>
        </div>
      </aside>
      <div class="article-content">
<div class="content-card">
  ${sectionsHtml}
  ${adminSectionsHtml}

  ${validRelated.length ? `<h2>関連項目</h2><div class="related-links">${related}</div>` : ''}
</div>

        <a class="back-top-link" href="#/">← 資料集トップへ戻る</a>
      </div>
    </div>`;
  initScrollSpy();
}


function renderAdminPage(){

  document.getElementById('home-hero').style.display = 'none';

  if(isAdmin){
    renderAdminDashboard();
    return;
  }

  document.getElementById('app').innerHTML = `
    <div class="article-page">

      <div class="content-card">

        <div class="admin-login">

          <h1>MOON CORE ADMIN</h1>

          <p>管理者認証</p>

          <input
            type="password"
            id="admin-password"
            placeholder="パスワード"
          >

          <button onclick="adminLogin()">
            ログイン
          </button>

        </div>

      </div>

    </div>
  `;

}


function renderAdminDashboard(){

  document.getElementById('app').innerHTML = `
    <div class="article-page">

      <div class="content-card">

        <h1>MOON CORE ADMIN</h1>

        <p>管理者としてログインしています。</p>

        <a class="btn" href="#/admin/related">RELATED CHECK を開く</a>

        <button onclick="adminLogout()">
          ログアウト
        </button>

      </div>

    </div>
  `;

}


function adminLogin(){

  const password =
    document.getElementById('admin-password').value;

  if(password === 'M7!qR2#vL9@tK4'){

    isAdmin = true;

    sessionStorage.setItem(
      'moonCoreAdmin',
      'true'
    );

    renderAdminDashboard();

  } else {

    alert('パスワードが正しくありません。');

  }

}


function adminLogout(){

  sessionStorage.removeItem('moonCoreAdmin');

  isAdmin = false;

  renderAdminPage();

}

/* ---------------- related管理（管理者用） ----------------
   node analyze_related.js と同じロジックのブラウザ版。今後、新しい記事を
   追加した際に「関連記事の設定忘れ」を見つけるための常設ツール。 */
function levenshteinJS(a, b){
  const m=a.length, n=b.length;
  const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n];
}

function relatedLooksLikeTerm(ref){
  const isJapanese = /[\u3040-\u30ff\u4e00-\u9fff]/.test(ref);
  const hasHyphen = ref.includes('-');
  return (isJapanese && !hasHyphen) || CATEGORIES.some(c=>c.key===ref);
}

function relatedIdTypoMatch(ref, ownerId, allIds){
  if(/^[a-z]+$/.test(ref) && ref.length<=6) return null; // 短い英単語はIDの断片ではなく用語の残骸の可能性が高い
  const refLower = ref.toLowerCase();
  const exact = allIds.find(id=>id.toLowerCase()===refLower && id!==ownerId);
  if(exact) return {id:exact, dist:0};
  const selfPrefixHit = allIds.some(id=>id===ownerId && id.toLowerCase().split('-')[0]===refLower && refLower.length>=3);
  if(selfPrefixHit) return null; // 本来別記事を指すはずが対象がまだ存在しない
  const prefixHit = allIds.find(id=>{
    if(id===ownerId) return false;
    return id.toLowerCase().split('-')[0]===refLower && refLower.length>=3;
  });
  if(prefixHit) return {id:prefixHit, dist:1};
  let best=null, bestDist=Infinity;
  allIds.forEach(id=>{
    if(id===ownerId) return;
    const d=levenshteinJS(refLower, id.toLowerCase());
    if(d<bestDist){bestDist=d; best=id;}
  });
  const threshold = ref.length<=6 ? 1 : Math.max(2, Math.floor(Math.max(ref.length, best?best.length:0)*0.3));
  if(best && bestDist<=threshold) return {id:best, dist:bestDist};
  return null;
}

function relatedArticleText(a){
  let text=(a.title||'')+' '+(a.lede||'');
  (a.sections||[]).forEach(s=>{
    text+=' '+(s.title||'');
    (s.blocks||[]).forEach(b=>{
      if(b.text) text+=' '+b.text;
      if(b.items) b.items.forEach(it=>{
        text+=' '+[it.label,it.value,it.name,it.desc,it.role].filter(Boolean).join(' ');
      });
    });
  });
  return text;
}

function computeRelatedAnalysis(){
  const idSet = new Set(ARTICLES.map(a=>a.id));
  const allIds = [...idSet];
  const titleToId = {}, sectionTitleToIds = {}, glossaryToId = {};
  (typeof GLOSSARY!=='undefined'?GLOSSARY:[]).forEach(g=>{ if(g.articleId) glossaryToId[g.term]=g.articleId; });
  ARTICLES.forEach(a=>{
    titleToId[a.title]=a.id;
    (a.sections||[]).forEach(s=>{
      if(!s.title) return;
      if(!sectionTitleToIds[s.title]) sectionTitleToIds[s.title]=[];
      sectionTitleToIds[s.title].push(a.id);
    });
  });

  function resolveBrokenRef(ref, ownerId){
    if(glossaryToId[ref] && glossaryToId[ref]!==ownerId) return {id:glossaryToId[ref], method:'glossary'};
    if(titleToId[ref] && titleToId[ref]!==ownerId) return {id:titleToId[ref], method:'title-exact'};
    const owners = (sectionTitleToIds[ref]||[]).filter(id=>id!==ownerId);
    if(owners.length===1) return {id:owners[0], method:'section-title'};
    if(owners.length===2) return {multi:owners, method:'section-title-multi'};
    if(relatedLooksLikeTerm(ref)) return null;
    const typo = relatedIdTypoMatch(ref, ownerId, allIds);
    if(typo) return {id:typo.id, method:'id-typo'};
    return null;
  }

  const dupRefs=[], resolvedFixes=[], removedRefs=[];
  ARTICLES.forEach(a=>{
    const rel=a.related||[];
    const seen=new Set();
    rel.forEach(ref=>{
      if(seen.has(ref)) dupRefs.push({id:a.id, title:a.title, ref});
      seen.add(ref);
      if(idSet.has(ref)) return;
      const result = resolveBrokenRef(ref, a.id);
      if(!result) removedRefs.push({ownerId:a.id, ownerTitle:a.title, ref, method:'unresolved'});
      else if(result.multi) result.multi.forEach(id=>resolvedFixes.push({ownerId:a.id, ownerTitle:a.title, ref, target:id, method:result.method}));
      else resolvedFixes.push({ownerId:a.id, ownerTitle:a.title, ref, target:result.id, method:result.method});
    });
  });

  const textCache={};
  ARTICLES.forEach(a=>{ textCache[a.id]=relatedArticleText(a); });
  const titleIndex = ARTICLES.map(a=>({id:a.id, title:a.title, cat:a.cat}));

  function candidatesFor(a, resolvedIds){
    const text=textCache[a.id];
    const existing=new Set(resolvedIds);
    const hits=[];
    titleIndex.forEach(o=>{
      if(o.id===a.id || existing.has(o.id) || o.title.length<2) return;
      const occAtoB = text.split(o.title).length-1;
      if(occAtoB===0) return;
      const occBtoA = textCache[o.id].split(a.title).length-1;
      let score = occAtoB*2;
      if(o.cat===a.cat) score+=1;
      if(occBtoA>0) score+=3;
      const confidence = score>=8 ? '✓' : (score>=4 ? '△' : null);
      if(confidence) hits.push({id:o.id, title:o.title, score, confidence});
    });
    return hits.sort((x,y)=>y.score-x.score).slice(0,6);
  }

  const perArticle={};
  ARTICLES.forEach(a=>{
    const rel=a.related||[];
    const kept=rel.filter(ref=>idSet.has(ref));
    const fixedHere=resolvedFixes.filter(f=>f.ownerId===a.id).map(f=>f.target);
    const resolvedIds=[...new Set([...kept, ...fixedHere])];
    const candidates=candidatesFor(a, resolvedIds);
    const highConf=candidates.filter(c=>c.confidence==='✓').map(c=>c.id);
    const medConf=candidates.filter(c=>c.confidence==='△');
    let autoAdded=[];
    if(resolvedIds.length<3) autoAdded=highConf.slice(0,4-resolvedIds.length);
    const finalIds=[...new Set([...resolvedIds, ...autoAdded])];
    const brokenCount = rel.length - kept.length;
    let status;
    if(brokenCount>0) status='自動修正可能';
    else if(finalIds.length===0) status='関連記事なし';
    else if(rel.length===0 && autoAdded.length>0) status='関連記事不足（自動補完）';
    else if(kept.length<2 && medConf.length>0) status='関連記事不足';
    else status='正常';
    perArticle[a.id]={title:a.title, status, before:rel, after:finalIds, autoAdded, mediumCandidates:medConf, brokenCount};
  });

  return {resolvedFixes, removedRefs, dupRefs, perArticle};
}

const relatedDecisions = { fixes:{}, addedCandidates:{} };

function relatedDecisionKey(articleId, ref){ return articleId+'::'+ref; }

function setRelatedFixDecision(articleId, ref, action, customValue){
  const key = relatedDecisionKey(articleId, ref);
  if(action==='ignore'){ delete relatedDecisions.fixes[key]; return; }
  relatedDecisions.fixes[key] = {articleId, ref, action, value: customValue};
}

function toggleRelatedCandidate(articleId, candidateId, checked){
  if(!relatedDecisions.addedCandidates[articleId]) relatedDecisions.addedCandidates[articleId]=[];
  const arr = relatedDecisions.addedCandidates[articleId];
  const idx = arr.indexOf(candidateId);
  if(checked && idx===-1) arr.push(candidateId);
  if(!checked && idx!==-1) arr.splice(idx,1);
}

function exportRelatedDecisions(){
  const data = JSON.stringify(relatedDecisions, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'related_decisions.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toastMsg('related_decisions.json をダウンロードしました');
}

function renderRelatedAdminPage(){
  document.getElementById('home-hero').style.display = 'none';

  if(!isAdmin){ renderAdminPage(); return; }

  const {resolvedFixes, removedRefs, perArticle} = computeRelatedAnalysis();

  const statusCounts = {};
  Object.values(perArticle).forEach(p => { statusCounts[p.status] = (statusCounts[p.status]||0)+1; });
  const statusOrder = ['正常','自動修正可能','関連記事不足（自動補完）','関連記事不足','関連記事なし'];
  const summaryRows = statusOrder
    .filter(s => statusCounts[s])
    .map(s => `<div class="related-summary-row"><span>${s}</span><strong>${statusCounts[s]}</strong></div>`)
    .join('');

  const fixRows = resolvedFixes.map(f => `
    <div class="related-check-row">
      <div class="related-check-main">
        <strong>${f.ownerTitle}</strong>（${f.ownerId}）: <code>${f.ref}</code> → <code>${f.target}</code>（${f.method}）
      </div>
      <div class="related-check-actions">
        <label><input type="radio" name="fix-${f.ownerId}-${f.ref}-${f.target}" checked onchange="setRelatedFixDecision('${f.ownerId}','${f.ref}','apply','${f.target}')"> 適用する</label>
        <label><input type="radio" name="fix-${f.ownerId}-${f.ref}-${f.target}" onchange="setRelatedFixDecision('${f.ownerId}','${f.ref}','keep')"> 見送る</label>
      </div>
    </div>`).join('');

  const removeRows = removedRefs.map(r => `
    <div class="related-check-row">
      <div class="related-check-main"><strong>${r.ownerTitle}</strong>（${r.ownerId}）: <code>${r.ref}</code> — 対応する記事が見つからないため削除候補</div>
      <div class="related-check-actions">
        <label><input type="radio" name="remove-${r.ownerId}-${r.ref}" checked onchange="setRelatedFixDecision('${r.ownerId}','${r.ref}','remove')"> 削除する</label>
        <label><input type="radio" name="remove-${r.ownerId}-${r.ref}" onchange="setRelatedFixDecision('${r.ownerId}','${r.ref}','keep')"> そのまま残す</label>
      </div>
    </div>`).join('');

  const shortageBlocks = Object.entries(perArticle)
    .filter(([, p]) => p.status !== '正常' && p.brokenCount === 0)
    .map(([id, p]) => {
      const items = [...p.autoAdded.map(cid=>({id:cid, mark:'✓', auto:true})),
                     ...p.mediumCandidates.map(c=>({id:c.id, mark:'△', title:c.title, auto:false}))];
      const rows = items.map(it => `
        <label class="related-candidate-item">
          <input type="checkbox" ${it.auto?'checked':''} onchange="toggleRelatedCandidate('${id}','${it.id}',this.checked)">
          ${it.mark} ${it.title || articleById(it.id)?.title || it.id}（${it.id}）
        </label>`).join('');
      return `<div class="related-check-row">
        <div class="related-check-main"><strong>${p.title}</strong>（${id}）｜${p.status}｜現在: ${(p.before||[]).join(', ')||'(なし)'}</div>
        <div class="related-candidate-list">${rows || '<span>候補なし</span>'}</div>
      </div>`;
    }).join('');

  document.getElementById('app').innerHTML = `
    <div class="article-page">
      <div class="content-card">
        <h1>RELATED AUTO CHECK</h1>
        <p>全記事 ${ARTICLES.length}</p>
        <div class="related-summary">${summaryRows}</div>
        <p>各項目を確認し、下部の「変更をエクスポート」でJSONを書き出せます。実データへの反映は <code>apply_related_decisions.js</code> で行います。</p>
        <button class="btn" onclick="exportRelatedDecisions()">変更をエクスポート</button>
        <a class="btn btn-ghost" href="#/admin">管理画面トップへ</a>
      </div>

      <div class="content-card">
        <h2>① 自動修正できる壊れた参照（${resolvedFixes.length}件）</h2>
        ${fixRows || '<p>該当なし</p>'}
      </div>

      <div class="content-card">
        <h2>② 対応する記事が見つからない参照（${removedRefs.length}件）</h2>
        ${removeRows || '<p>該当なし</p>'}
      </div>

      <div class="content-card">
        <h2>③ 関連記事が不足／未設定の記事（✓＝自動追加候補・△＝要検討）</h2>
        ${shortageBlocks || '<p>該当なし</p>'}
      </div>
    </div>`;
}


function router(){

  const hash = location.hash;

if(hash === '#/articles'){

  renderAllArticles();

} else if(hash.startsWith('#/calendar/')){

  setBackgroundTheme(null);
  document.getElementById('home-hero').style.display = 'none';
  renderCalendarPage(document.getElementById('app'), hash.replace('#/calendar/',''));

} else if(hash === '#/calendar'){

  setBackgroundTheme(null);
  document.getElementById('home-hero').style.display = 'none';
  renderCalendarPage(document.getElementById('app'));

} else if(hash.startsWith('#/news/')){

  renderNewsPage(hash.replace('#/news/',''));

} else if(hash === '#/news'){

  renderNewsPage();

} else if(hash === '#/life/novels'){

  renderLifeNovels();

} else if(hash === '#/world-map'){

  renderWorldMap();

} else if(hash === '#/history/articles'){

  renderHistoryArticles();

} else if(hash === '#/history/timeline'){

  renderHistoryTimeline();

} else if(hash.startsWith('#/article/')){

    renderArticlePage(hash.replace('#/article/',''));

} else if(hash === '#/admin'){

    renderAdminPage();

} else if(hash === '#/admin/related'){

    renderRelatedAdminPage();

} else if(hash.startsWith('#/category/')){

    renderCategoryPage(hash.replace('#/category/',''));

} else if(hash === '' || hash === '#/' || hash === '#'){

    renderHome();

} else {

    // ページ内アンカー（目次リンクなど）は無視
    return;

}

  window.scrollTo({ top:0, behavior:'auto' });

}

window.addEventListener('hashchange', router);

/* ---------------- トースト ---------------- */
let toastTimer;
function toastMsg(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ---------------- 検索 ---------------- */
function buildSearchIndex(){
  const fromArticles = ARTICLES.map(a => ({name:a.title, cat:catByKey(a.cat).name, href:`#/article/${a.id}`}));
  const fromGlossary = GLOSSARY.filter(g => !ARTICLES.find(a=>a.id===g.articleId)).map(g => ({name:g.term, cat:'用語集', href:null}));
  const fromNews = (typeof NEWS_ITEMS !== 'undefined' ? NEWS_ITEMS : []).map(n => ({name:n.title, cat:'ニュース', href:`#/news/${n.id}`}));
  const fromCalendar = (typeof CALENDAR_EVENTS !== 'undefined' ? CALENDAR_EVENTS : []).map(ev => ({name:ev.name, cat:'カレンダー', href:`#/calendar/${ev.id}`}));
  const fromWorldMap = [{name:'世界地図', cat:'地図', href:'#/world-map'}];
  return fromArticles.concat(fromGlossary, fromNews, fromCalendar, fromWorldMap);
}
const SEARCH_INDEX = buildSearchIndex();

function openSearch(){
  document.getElementById('search-overlay').classList.add('open');
  document.getElementById('search-input').value = '';
  runSearch('');
  setTimeout(()=>document.getElementById('search-input').focus(), 60);
}
function closeSearch(){ document.getElementById('search-overlay').classList.remove('open'); }
function runSearch(q){
  const results = document.getElementById('search-results');
  const filtered = q.trim()==='' ? SEARCH_INDEX : SEARCH_INDEX.filter(i => i.name.includes(q) || i.cat.includes(q));
  if(filtered.length === 0){
    results.innerHTML = `<div class="search-empty">「${q}」に一致する項目が見つかりませんでした</div>`;
    return;
  }
  results.innerHTML = filtered.map(i => `
    <div class="search-result-item" onclick="${i.href ? `closeSearch(); location.hash='${i.href}';` : `closeSearch(); toastMsg('「${i.name}」— 詳細ページは準備中です')`}">
      <span class="sr-name">${i.name}</span><span class="sr-cat">${i.cat}</span>
    </div>`).join('');
}
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeSearch();
  if((e.metaKey || e.ctrlKey) && e.key === 'k'){ e.preventDefault(); openSearch(); }
});

/* ---------------- テーマ切替 ---------------- */
function toggleTheme(){
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

const heroLogo = document.getElementById('hero-logo');

if (heroLogo) {
    heroLogo.src =
        document.documentElement.dataset.theme === 'dark'
        ? 'assets/mooncore4.svg'
        : 'assets/mooncore3.svg';
}}

/* ---------------- カードのフェードイン ---------------- */
function initCardObserver(){
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); obs.unobserve(en.target); } });
  }, {threshold:0.1});
  document.querySelectorAll('.cat-card').forEach(el => obs.observe(el));
}

/* ---------------- 目次スクロールスパイ ---------------- */
function initScrollSpy(){
  const links = Array.from(document.querySelectorAll('#toc-list a'));
  const targets = links.map(l => document.querySelector(l.getAttribute('href')));
  window.onscroll = () => {
    let current = targets[0];
    const pos = window.scrollY + 140;
    targets.forEach(t => { if(t && t.offsetTop <= pos) current = t; });
    links.forEach(l => l.classList.toggle('active', current && l.getAttribute('href') === '#' + current.id));
  };
}

/* ---------------- 初期化 ---------------- */
renderNav();
router();
if(!location.hash) renderHome();
