/* ==========================================================================
   WORLD CALENDAR — 世界カレンダー（描画ロジック）
   ルート: #/calendar  /  #/calendar/{行事id}

   設計方針:
   - 年は扱わない（統合暦の「1年の暦」を表示するページのため）
   - 曜日は表示しない
   - 行事があるセルには行事名を直接表示（3件以上は「＋N件」で省略）
   - 行事クリックはモーダルで詳細表示（カレンダー上・行事一覧どちらからでも同じモーダル）
   - 行事に articleId があり、該当記事が実在する場合のみ「詳細を見る →」を表示し、
     既存の記事ページ（#/article/{id}, articleById()）へ接続する
   - イベントデータは js/data/calendar-events.js の CALENDAR_EVENTS を使う
   - 見た目は MOON CORE の記事ページと同じ部品（page-header / title-block / cat-badge）を使い、
     国の色は国家記事の accentColor から取る（全世界はアクセント色）
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. 状態
   -------------------------------------------------------------------------- */

const calendarState = {
    month: (typeof tdNow === 'function' ? tdNow() : new Date()).getMonth() + 1,  // 開いたときは今月
    country: '全て'
};

// 月ごとの日数（うるう年の概念を持たないため固定）
const CALENDAR_MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CALENDAR_MONTH_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/* --------------------------------------------------------------------------
   2. ユーティリティ
   -------------------------------------------------------------------------- */

function calendarToday() {
    const d = (typeof tdNow === 'function') ? tdNow() : new Date();
    return { month: d.getMonth() + 1, day: d.getDate() };
}

// 国名 → 色（国家記事の accentColor）。全世界はサイトのアクセント色
function calendarCountryColor(name) {
    if (name === '全世界') return 'var(--accent-signal)';
    const a = (typeof ARTICLES !== 'undefined') ? ARTICLES.find(x => x.cat === 'nation' && x.title === name) : null;
    return (a && a.accentColor) || 'var(--text-tertiary)';
}
function calendarEventColor(ev) {
    const own = ev.countries.find(c => c !== '全世界');
    return calendarCountryColor(own || '全世界');
}
function calendarCountryChips(ev) {
    return ev.countries.map(c =>
        `<span class="cal-country" style="--cc:${calendarCountryColor(c)}">${c}</span>`
    ).join('');
}

// CALENDAR_EVENTSから登場する国名を重複なく取り出す（「全世界」は除く）
function getCalendarCountryList() {
    const set = new Set();
    CALENDAR_EVENTS.forEach(ev => {
        ev.countries.forEach(c => {
            if (c !== '全世界') set.add(c);
        });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
}

// 現在の国フィルターを考慮して、そのイベントを表示すべきか判定
function isEventVisible(ev) {
    if (calendarState.country === '全て') return true;
    return ev.countries.includes('全世界') || ev.countries.includes(calendarState.country);
}

// 指定した月日のイベントを、国フィルターを考慮して取得
function getEventsForDay(month, day) {
    return CALENDAR_EVENTS.filter(ev => ev.month === month && ev.day === day && isEventVisible(ev));
}

// 指定した月の全イベントを、国フィルターを考慮して日付順に取得
function getEventsForMonth(month) {
    return CALENDAR_EVENTS
        .filter(ev => ev.month === month && isEventVisible(ev))
        .sort((a, b) => a.day - b.day);
}

function getDaysInMonth(month) {
    return CALENDAR_MONTH_LENGTHS[month - 1];
}

// idからイベントを取得（モーダル表示用）
function getEventById(id) {
    return CALENDAR_EVENTS.find(ev => ev.id === id);
}

/* --------------------------------------------------------------------------
   3. ページ全体の生成
   -------------------------------------------------------------------------- */

// app.js から #/calendar に遷移した際にこの関数が呼ばれる想定
// openId を渡すと（#/calendar/{id} からの遷移など）該当行事の月へ移動し、モーダルを自動で開く
function renderCalendarPage(container, openId) {
    const today = calendarToday();
    const lifeCat = (typeof catByKey === 'function') ? catByKey('life') : null;

    container.innerHTML = `
        <div class="page-header cal-page-header">
            <div class="breadcrumb">
                <a href="#/">MOON CORE</a><span>/</span>
                ${lifeCat ? `<a href="#/category/life">${lifeCat.name}</a><span>/</span>` : ''}
                <span style="color:var(--text-primary)">世界カレンダー</span>
            </div>
            <div class="title-block fade-seq">
                <span class="cat-badge">WORLD CALENDAR</span>
                <h1>世界カレンダー</h1>
                <p class="lede">統合暦の一年に、世界各国の祝日・祭り・記念日を並べた暦。日付を押すと、その日の行事の詳細を読めます。</p>
                <div class="meta-row">
                    <span>登録行事：${CALENDAR_EVENTS.length}件</span>
                    <span>今日：${today.month}月${today.day}日</span>
                    <span>年・曜日は扱わない一年の暦</span>
                </div>
            </div>
        </div>

        <section class="cal-wrap calendar-page">
            <nav class="cal-year" id="calendar-year" aria-label="月を選ぶ"></nav>

            <div class="cal-toolbar">
                <div class="cal-toolbar__month">
                    <button class="cal-nav-btn" id="calendar-prev" aria-label="前の月">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 5 8 12 15 19"/></svg>
                    </button>
                    <div class="cal-month-label" id="calendar-label"></div>
                    <button class="cal-nav-btn" id="calendar-next" aria-label="次の月">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>
                    </button>
                </div>
                <button class="cal-today-btn" id="calendar-today">今日へ</button>
            </div>

            <nav class="cal-filter" id="calendar-filter" aria-label="国で絞り込む"></nav>

            <div class="cal-grid" id="calendar-grid"></div>

            <div class="cal-events">
                <div class="cal-events__head">
                    <div>
                        <h2 class="cal-events__title" id="calendar-events-month"></h2>
                        <div class="cal-events__sub" id="calendar-events-sub"></div>
                    </div>
                </div>
                <div class="cal-events__list" id="calendar-events-list"></div>
            </div>
        </section>

        <div class="calendar-modal" id="calendar-modal" hidden>
            <div class="calendar-modal__backdrop" id="calendar-modal-backdrop"></div>
            <div class="calendar-modal__card" role="dialog" aria-modal="true">
                <button class="calendar-modal__close" id="calendar-modal-close" aria-label="閉じる">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
                <div class="calendar-modal__body" id="calendar-modal-body"></div>
            </div>
        </div>
    `;

    document.getElementById('calendar-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('calendar-next').addEventListener('click', () => changeMonth(1));
    document.getElementById('calendar-today').addEventListener('click', () => {
        calendarState.month = calendarToday().month;
        closeEventModal();
        renderAllCalendarParts();
    });
    document.getElementById('calendar-modal-close').addEventListener('click', closeEventModal);
    document.getElementById('calendar-modal-backdrop').addEventListener('click', closeEventModal);
    document.addEventListener('keydown', calendarEscClose);

    if (openId) {
        const ev = getEventById(openId);
        if (ev) calendarState.month = ev.month;
    }

    renderCountryFilter();
    renderAllCalendarParts();

    if (openId) {
        const ev = getEventById(openId);
        if (ev) openEventModal(ev);
    }
}

function calendarEscClose(e) {
    if (e.key === 'Escape') closeEventModal();
}

function renderAllCalendarParts() {
    renderYearStrip();
    renderCalendar();
    renderEventsList();
}

/* --------------------------------------------------------------------------
   4. 一年の帯（12か月と行事の多さ）
   -------------------------------------------------------------------------- */

function renderYearStrip() {
    const el = document.getElementById('calendar-year');
    if (!el) return;
    const counts = CALENDAR_MONTH_LENGTHS.map((_, i) => getEventsForMonth(i + 1).length);
    const max = Math.max(1, ...counts);
    const today = calendarToday();

    el.innerHTML = counts.map((n, i) => {
        const m = i + 1;
        return `
            <button class="cal-year__m${m === calendarState.month ? ' is-active' : ''}${m === today.month ? ' is-now' : ''}" data-month="${m}" aria-label="${m}月（${n}件）">
                <span class="cal-year__name">${m}月</span>
                <span class="cal-year__count">${n}</span>
                <span class="cal-year__bar"><i style="width:${(n / max * 100).toFixed(1)}%"></i></span>
            </button>`;
    }).join('');

    el.querySelectorAll('.cal-year__m').forEach(b => {
        b.addEventListener('click', () => {
            calendarState.month = parseInt(b.dataset.month, 10);
            closeEventModal();
            renderAllCalendarParts();
        });
    });
}

/* --------------------------------------------------------------------------
   5. 国別フィルター
   -------------------------------------------------------------------------- */

function renderCountryFilter() {
    const filterEl = document.getElementById('calendar-filter');
    if (!filterEl) return;

    const countries = ['全て', ...getCalendarCountryList()];

    filterEl.innerHTML = countries.map(c => `
        <button
            class="cal-chip${c === calendarState.country ? ' is-active' : ''}"
            data-country="${c}"
            style="--cc:${c === '全て' ? 'var(--accent-signal)' : calendarCountryColor(c)}"
        >${c}</button>
    `).join('');

    filterEl.querySelectorAll('.cal-chip').forEach(btn => {
        btn.addEventListener('click', () => filterCountry(btn.dataset.country));
    });
}

function filterCountry(country) {
    calendarState.country = country;
    closeEventModal();
    renderCountryFilter();
    renderAllCalendarParts();
}

/* --------------------------------------------------------------------------
   6. カレンダー本体
   年・曜日は扱わない。1日〜月末までを7列で並べるだけ。
   -------------------------------------------------------------------------- */

function renderCalendar() {
    const gridEl = document.getElementById('calendar-grid');
    const labelEl = document.getElementById('calendar-label');
    if (!gridEl || !labelEl) return;

    const { month } = calendarState;
    const total = getEventsForMonth(month).length;
    labelEl.innerHTML = `<span class="cal-month-label__ja">${month}月</span><span class="cal-month-label__en">${CALENDAR_MONTH_EN[month - 1]} ・ ${total} EVENTS</span>`;

    const daysInMonth = getDaysInMonth(month);
    let cellsHtml = '';

    for (let day = 1; day <= daysInMonth; day++) {
        const events = getEventsForDay(month, day);
        cellsHtml += renderCalendarCell(day, events);
    }

    gridEl.innerHTML = `
        <div class="calendar-cells cal-cells">
            ${cellsHtml}
        </div>
    `;

    gridEl.querySelectorAll('.calendar-cell.has-event').forEach(cell => {
        cell.addEventListener('click', () => {
            const day = parseInt(cell.dataset.day, 10);
            const events = getEventsForDay(month, day);
            if (events.length === 1) {
                openEventModal(events[0]);
            } else if (events.length > 1) {
                openDayEventsModal(month, day, events);
            }
        });
    });
}

// 1セル分のHTMLを作る。行事は最大2件名前を表示し、それ以上は「＋N件」で省略
function renderCalendarCell(day, events) {
    const MAX_NAMES = 2;
    const shown = events.slice(0, MAX_NAMES);
    const restCount = events.length - shown.length;
    const today = calendarToday();
    const isToday = calendarState.month === today.month && day === today.day;

    const namesHtml = shown.map(ev => `
        <span class="calendar-cell__event-name" style="--cc:${calendarEventColor(ev)}">${ev.name}</span>
    `).join('');

    const moreHtml = restCount > 0
        ? `<span class="calendar-cell__more">＋${restCount}件</span>`
        : '';

    // スマホでは行事名の代わりに国の色の点を並べる
    const dotsHtml = events.slice(0, 4).map(ev => `<i style="--cc:${calendarEventColor(ev)}"></i>`).join('');

    return `
        <button
            class="calendar-cell${events.length ? ' has-event' : ''}${isToday ? ' is-today' : ''}"
            data-day="${day}"
            ${events.length ? '' : 'tabindex="-1"'}
            aria-label="${calendarState.month}月${day}日${events.length ? `、行事${events.length}件` : ''}${isToday ? '（今日）' : ''}"
        >
            <span class="calendar-cell__head">
                <span class="calendar-cell__day">${day}</span>
                ${isToday ? '<span class="calendar-cell__today">TODAY</span>' : ''}
            </span>
            ${events.length ? `
                <span class="calendar-cell__events">
                    ${namesHtml}
                    ${moreHtml}
                </span>
                <span class="calendar-cell__dots">${dotsHtml}</span>
            ` : ''}
        </button>
    `;
}

/* --------------------------------------------------------------------------
   7. 月移動（年は増減させない。12月→1月、1月→12月で循環）
   -------------------------------------------------------------------------- */

function changeMonth(delta) {
    let next = calendarState.month + delta;

    if (next > 12) next = 1;
    if (next < 1) next = 12;

    calendarState.month = next;

    closeEventModal();
    renderAllCalendarParts();
}

/* --------------------------------------------------------------------------
   8. 行事一覧（その月の行事を、日付ごとにまとめて常時表示）
   -------------------------------------------------------------------------- */

function renderEventsList() {
    const monthEl = document.getElementById('calendar-events-month');
    const subEl = document.getElementById('calendar-events-sub');
    const listEl = document.getElementById('calendar-events-list');
    if (!monthEl || !listEl) return;

    const { month } = calendarState;
    const events = getEventsForMonth(month);
    monthEl.textContent = `${month}月の行事`;
    if (subEl) subEl.textContent = `EVENTS — ${events.length}件${calendarState.country !== '全て' ? ` ・ ${calendarState.country}＋全世界` : ''}`;

    if (!events.length) {
        listEl.innerHTML = `<p class="cal-events__empty">この月の行事はありません。</p>`;
        return;
    }

    const today = calendarToday();
    const byDay = new Map();
    events.forEach(ev => { if (!byDay.has(ev.day)) byDay.set(ev.day, []); byDay.get(ev.day).push(ev); });

    listEl.innerHTML = [...byDay.entries()].map(([day, evs]) => `
        <div class="cal-day${month === today.month && day === today.day ? ' is-today' : ''}">
            <div class="cal-day__date">
                <span class="cal-day__num">${day}</span>
                <span class="cal-day__mon">${CALENDAR_MONTH_EN[month - 1]}</span>
            </div>
            <div class="cal-day__items">
                ${evs.map(ev => `
                    <button class="calendar-event-row cal-row" data-id="${ev.id}" style="--cc:${calendarEventColor(ev)}">
                        <span class="cal-row__type">${ev.type}</span>
                        <span class="cal-row__name">${ev.name}</span>
                        <span class="cal-row__countries">${calendarCountryChips(ev)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');

    listEl.querySelectorAll('.calendar-event-row').forEach(row => {
        row.addEventListener('click', () => {
            const ev = getEventById(row.dataset.id);
            if (ev) openEventModal(ev);
        });
    });
}

/* --------------------------------------------------------------------------
   9. モーダル
   -------------------------------------------------------------------------- */

function openEventModal(ev) {
    const modalEl = document.getElementById('calendar-modal');
    const bodyEl = document.getElementById('calendar-modal-body');
    if (!modalEl || !bodyEl) return;

    const hasArticle = ev.articleId && typeof articleById === 'function' && articleById(ev.articleId);

    modalEl.style.setProperty('--cc', calendarEventColor(ev));
    bodyEl.innerHTML = `
        <div class="calendar-modal__top">
            <span class="calendar-modal__date">${String(ev.month).padStart(2, '0')}.${String(ev.day).padStart(2, '0')}</span>
            <span class="calendar-modal__type">${ev.type}</span>
        </div>
        <h3 class="calendar-modal__name">${ev.name}</h3>
        <p class="calendar-modal__date-ja">${ev.month}月${ev.day}日${ev.established != null ? ` ・ 統合暦${ev.established}年制定` : ''}</p>

        <div class="calendar-modal__meta">${calendarCountryChips(ev)}</div>

        <p class="calendar-modal__desc">${ev.description}</p>

        ${(ev.relatedHistory || hasArticle) ? `
            <div class="calendar-modal__links">
                ${ev.relatedHistory ? `
                    <a href="#/history/timeline" class="calendar-modal__history">
                        <span class="calendar-modal__history-label">関連する歴史</span>
                        <span class="calendar-modal__history-name">${ev.relatedHistory}</span>
                        <span class="calendar-modal__link">歴史年表を見る →</span>
                    </a>
                ` : ''}
                ${hasArticle ? `
                    <a href="#/article/${ev.articleId}" class="calendar-modal__link calendar-modal__link--article">詳細を見る →</a>
                ` : ''}
            </div>
        ` : ''}
    `;

    modalEl.hidden = false;
}

// 同じ日に複数の行事があり、セルから開いた場合はその日の一覧をモーダルに出す
function openDayEventsModal(month, day, events) {
    const modalEl = document.getElementById('calendar-modal');
    const bodyEl = document.getElementById('calendar-modal-body');
    if (!modalEl || !bodyEl) return;

    modalEl.style.setProperty('--cc', 'var(--accent-signal)');
    bodyEl.innerHTML = `
        <div class="calendar-modal__top">
            <span class="calendar-modal__date">${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}</span>
            <span class="calendar-modal__type">${events.length}件</span>
        </div>
        <h3 class="calendar-modal__name">${month}月${day}日の行事</h3>
        <div class="calendar-modal__day-list">
            ${events.map(ev => `
                <button class="calendar-modal__day-item" data-id="${ev.id}" style="--cc:${calendarEventColor(ev)}">
                    <span class="calendar-modal__day-item-name">${ev.name}</span>
                    <span class="calendar-modal__day-item-meta">${ev.type} ・ ${ev.countries.join('・')}</span>
                </button>
            `).join('')}
        </div>
    `;

    bodyEl.querySelectorAll('.calendar-modal__day-item').forEach(item => {
        item.addEventListener('click', () => {
            const ev = getEventById(item.dataset.id);
            if (ev) openEventModal(ev);
        });
    });

    modalEl.hidden = false;
}

function closeEventModal() {
    const modalEl = document.getElementById('calendar-modal');
    if (modalEl) modalEl.hidden = true;
}
