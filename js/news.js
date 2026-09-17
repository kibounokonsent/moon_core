/* ==========================================================================
   WORLD NEWS — 世界ニュース（描画ロジック）
   ルート: #/news

   設計方針:
   - ニュースは「出来事の発生日」を持たない。updated（資料の更新日）のみを持つ。
   - 一覧は updated の新しい順に並べる。
   - クリックはモーダルで詳細表示する（世界カレンダーの行事モーダルと同じ作法）。
   - 関連記事・関連国家は、既存の ARTICLES を articleById() で解決して表示する。
     新しいIDの型を増やさず、既存の記事ページ（#/article/{id}）へそのまま繋げる。
   - イベントデータは js/data/news-items.js の NEWS_ITEMS を使う。
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. ユーティリティ
   -------------------------------------------------------------------------- */

// idからニュースを取得
function newsById(id) {
    return NEWS_ITEMS.find(n => n.id === id);
}

// updatedの新しい順に並べたニュース一覧
function getSortedNews() {
    return [...NEWS_ITEMS].sort((a, b) => new Date(b.updated) - new Date(a.updated));
}

/* --------------------------------------------------------------------------
   2. ページ全体の生成
   -------------------------------------------------------------------------- */

// app.js から #/news に遷移した際にこの関数が呼ばれる想定
// openId を渡すと（#/news/{id} からの遷移など）該当ニュースのモーダルを自動で開く
function renderNewsPage(openId) {

    setBackgroundTheme(null);
    document.getElementById('home-hero').style.display = 'none';

    const news = getSortedNews();

    const rowsHtml = news.map(n => {
        const cat = catByKey(n.category);
        return `
            <button class="news-row" data-id="${n.id}">
                <span class="news-row__date">${n.updated}</span>
                <span class="news-row__title">${n.title}</span>
                <span class="news-row__cat" style="color:${cat ? cat.color : 'var(--accent-signal)'}">
                    ${cat ? cat.name : n.category}
                </span>
            </button>
        `;
    }).join('');

    document.getElementById('app').innerHTML = `
        <div class="page-header">
            <div class="breadcrumb">
                <a href="#/">MOON CORE</a>
                <span>/</span>
                <span style="color:var(--text-primary)">世界ニュース</span>
            </div>

            <div class="title-block fade-seq">
                <span class="cat-badge">WORLD NEWS</span>
                <h1>世界ニュース</h1>
                <p class="lede">未来世界に関するニュースを掲載しています。</p>
            </div>
        </div>

        <div class="wrap news-list-wrap">
            ${news.length ? `
                <div class="news-list">
                    ${rowsHtml}
                </div>
            ` : `
                <p class="news-empty">現在掲載しているニュースはありません。</p>
            `}
        </div>

        <div class="news-modal" id="news-modal" hidden>
            <div class="news-modal__backdrop" id="news-modal-backdrop"></div>
            <div class="news-modal__card" role="dialog" aria-modal="true">
                <button class="news-modal__close" id="news-modal-close" aria-label="閉じる">×</button>
                <div class="news-modal__body" id="news-modal-body"></div>
            </div>
        </div>
    `;

    document.getElementById('news-modal-close').addEventListener('click', closeNewsModal);
    document.getElementById('news-modal-backdrop').addEventListener('click', closeNewsModal);

    document.querySelectorAll('.news-row').forEach(row => {
        row.addEventListener('click', () => {
            const n = newsById(row.dataset.id);
            if (n) openNewsModal(n);
        });
    });

    if (openId) {
        const target = newsById(openId);
        if (target) openNewsModal(target);
    }
}

/* --------------------------------------------------------------------------
   3. モーダル
   -------------------------------------------------------------------------- */

function openNewsModal(n) {
    const modalEl = document.getElementById('news-modal');
    const bodyEl = document.getElementById('news-modal-body');
    if (!modalEl || !bodyEl) return;

    const cat = catByKey(n.category);

    const relatedArticles = (n.relatedArticleIds || [])
        .map(id => articleById(id))
        .filter(Boolean);

    const relatedNations = (n.relatedNationIds || [])
        .map(id => articleById(id))
        .filter(Boolean);

    bodyEl.innerHTML = `
        <span class="news-modal__cat" style="color:${cat ? cat.color : 'var(--accent-signal)'}">
            ${cat ? cat.name : n.category}
        </span>

        <h3 class="news-modal__title">${n.title}</h3>
        <p class="news-modal__date">更新日：${n.updated}</p>

        <p class="news-modal__text">${n.text}</p>

        ${relatedArticles.length ? `
            <div class="news-modal__related">
                <p class="news-modal__related-label">関連記事</p>
                ${relatedArticles.map(a => `
                    <a href="#/article/${a.id}" class="news-modal__link" onclick="closeNewsModal()">${a.title} →</a>
                `).join('')}
            </div>
        ` : ''}

        ${relatedNations.length ? `
            <div class="news-modal__related">
                <p class="news-modal__related-label">関連国家</p>
                ${relatedNations.map(a => `
                    <a href="#/article/${a.id}" class="news-modal__link" onclick="closeNewsModal()">${a.title} →</a>
                `).join('')}
            </div>
        ` : ''}
    `;

    modalEl.hidden = false;
}

function closeNewsModal() {
    const modalEl = document.getElementById('news-modal');
    if (modalEl) modalEl.hidden = true;
}
