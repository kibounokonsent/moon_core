/* ==========================================================================
   today.js — 「今日の世界」まわりの機能

   1. トップページ「今日の世界」（今日の行事＋最新ニュース）   tdHomeSection()
   2. 部屋ページ  #/room  /  #/room/{国家id}                  renderRoomPage()
      - 窓：その国の空模様（見ている人の時計で朝・昼・夕方・夜が変わる）
      - 壁のカレンダー：その国の今日の行事（なければ次の行事）
      - 机の端末：その国のニュース
      - 本棚：今日の一冊（まだ読んでいない記事を優先）
      - 世界の空模様：全国家の今日の天気。押すとその国の部屋へ
   3. 記事ページの逆引き（この記事にまつわる行事・ニュース）     tdArticleLinks(a)
   4. ヘッダーの「部屋」ボタンと「⋯」メニュー

   データは既存のものだけを使う（新しい設定は作らない）：
     CALENDAR_EVENTS（行事）／NEWS_ITEMS（ニュース）／CLIMATE_DATA（月ごとの気温・降水量）
     ARTICLES（国家記事の accentColor など）
   天気は CLIMATE_DATA の月平均から「日付ごとに決まった値」を作るので、
   同じ日なら誰が見ても同じ天気になる。

   確認用：URLに ?hour=19 を付けると時刻を、?date=12-24 を付けると日付を差し替えられる
   （例：index.html?hour=6#/room ）
   ========================================================================== */

/* --------------------------------------------------------------------------
   0. 共通
   -------------------------------------------------------------------------- */

function tdNow(){
  const d = new Date();
  try{
    const q = new URLSearchParams(location.search);
    if(q.has('date')){ const [m, dd] = q.get('date').split('-').map(Number); if(m && dd) d.setMonth(m - 1, dd); }
    if(q.has('hour')) d.setHours(Number(q.get('hour')), Number(q.get('min') || 0));
  }catch(e){}
  return d;
}

// 文字列から決まった乱数を作る（同じ日・同じ国なら同じ結果になる）
function tdHash(str){
  let h = 2166136261;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function tdRand(seed){
  let a = tdHash(String(seed));
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const tdYmd = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const tdClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tdShort = (s, n) => (s && s.length > n) ? s.slice(0, n - 1) + '…' : (s || '');

function tdNations(){
  return ARTICLES.filter(a => a.cat === 'nation')
    .slice()
    .sort((x, y) => x.title.localeCompare(y.title, 'ja'));
}
function tdNationByTitle(title){ return ARTICLES.find(a => a.cat === 'nation' && a.title === title); }

/* --------------------------------------------------------------------------
   1. 行事
   -------------------------------------------------------------------------- */

const TD_WORLD = '全世界';
function tdEvents(){ return (typeof CALENDAR_EVENTS !== 'undefined') ? CALENDAR_EVENTS : []; }

// nationTitle を渡すと「その国＋全世界」の行事だけに絞る
function tdEventsOn(month, day, nationTitle){
  return tdEvents().filter(ev =>
    ev.month === month && ev.day === day &&
    (!nationTitle || (ev.countries || []).some(c => c === TD_WORLD || c === nationTitle))
  );
}

// 今日より後で、最初に行事がある日（1年先まで）
function tdNextEvents(from, nationTitle){
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for(let i = 1; i <= 366; i++){
    d.setDate(d.getDate() + 1);
    const evs = tdEventsOn(d.getMonth() + 1, d.getDate(), nationTitle);
    if(evs.length) return { days:i, month:d.getMonth() + 1, day:d.getDate(), events:evs };
  }
  return null;
}

function tdEventCountries(ev){
  return (ev.countries || []).join('・');
}

/* --------------------------------------------------------------------------
   2. ニュース・今日の一冊
   -------------------------------------------------------------------------- */

function tdNews(){
  if(typeof NEWS_ITEMS === 'undefined') return [];
  return NEWS_ITEMS.slice().sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}
function tdNewsFor(id){
  return tdNews().filter(n => (n.relatedNationIds || []).includes(id) || (n.relatedArticleIds || []).includes(id));
}

function tdExplored(){
  try { return new Set(JSON.parse(localStorage.getItem('moonCoreExplored') || '[]')); } catch(e){ return new Set(); }
}

// 今日の一冊：まだ読んでいない記事から、日付で1つ選ぶ（全部読んでいたら全記事から）
function tdDailyArticle(now, salt){
  const seen = tdExplored();
  let pool = ARTICLES.filter(a => !seen.has(a.id));
  if(!pool.length) pool = ARTICLES.slice();
  pool.sort((a, b) => a.id < b.id ? -1 : 1);
  const r = tdRand('book:' + tdYmd(now) + (salt || ''));
  return pool[Math.floor(r() * pool.length)];
}

/* --------------------------------------------------------------------------
   3. 天気（CLIMATE_DATA の月平均から作る）
   -------------------------------------------------------------------------- */

// 一日の気温差（日較差）。書いていない国は 8℃
const TD_DIURNAL = {
  kyuma:16, belnea:3, sanrudo:11, 'fumora-skypill':1, tasumenio:4, larliafrus:6,
  'chiriludo-ailtsua':5, garhyura:9, maimok:7
};

const TD_WEATHER_LABEL = {
  indoor:'施設内（管理環境）', clear:'晴れ', partly:'晴れ時々くもり', cloudy:'くもり', rain:'雨', heavy:'強い雨',
  snow:'雪', blizzard:'吹雪', fog:'濃霧', sand:'砂嵐', managed:'晴れ（気象管理下）', dome:'ドーム内 管理環境'
};

function tdMonthTemp(c, now){
  const m = now.getMonth(), d = now.getDate();
  const len = new Date(now.getFullYear(), m + 1, 0).getDate();
  const f = (d - 1) / len;                       // 月の中での位置（0〜1）
  const cur = c.months[m], other = f < .5 ? c.months[(m + 11) % 12] : c.months[(m + 1) % 12];
  const w = Math.abs(f - .5);                   // 月の真ん中から離れるほど隣の月に寄せる
  return { temp: cur.temp + (other.temp - cur.temp) * w, rain: cur.rain + (other.rain - cur.rain) * w };
}

function tdWeather(id, now){
  const c = (typeof CLIMATE_DATA !== 'undefined') ? CLIMATE_DATA[id] : null;
  if(!c || !c.months) return null;
  const r = tdRand('wx:' + id + ':' + tdYmd(now));
  const base = tdMonthTemp(c, now);
  const mean = base.temp + (r() - .5) * 4;
  const amp = (TD_DIURNAL[id] || 8) / 2;
  const hi = mean + amp, lo = mean - amp;

  // 現在の気温：朝5時ごろ最低、14時ごろ最高
  const h = now.getHours() + now.getMinutes() / 60;
  let k;
  if(h >= 5 && h <= 14) k = .5 - .5 * Math.cos(Math.PI * (h - 5) / 9);
  else { const t = h > 14 ? h - 14 : h + 10; k = .5 + .5 * Math.cos(Math.PI * t / 15); }
  const cur = lo + (hi - lo) * k;

  // 降水の起こりやすさ（月降水量から）
  const pRain = tdClamp(base.rain / 260, .02, .62);
  const roll = r(), roll2 = r();
  let kind;
  if(roll < pRain) kind = roll < pRain * .3 && base.rain > 120 ? 'heavy' : 'rain';
  else if(roll < pRain + .22) kind = 'cloudy';
  else if(roll < pRain + .5) kind = 'partly';
  else kind = 'clear';
  if((kind === 'rain' || kind === 'heavy') && mean <= 1) kind = 'snow';

  let note = '';
  switch(id){
    case 'fumora-skypill':
      kind = 'managed'; note = '成層圏の人工環境。気温・降水は技術によって一定に保たれている。'; break;
    case 'belnea':
      kind = 'dome'; note = `ドームの外郭は${roll2 < .15 ? '砂嵐' : '乾いた砂漠の空'}。内部は区画ごとに管理されている。`; break;
    case 'maimok':
      kind = 'fog';
      note = '霧は昼に濃くなり、街全体がピンク色に光って見える。'; break;
    case 'sertcity': {
      const outside = TD_WEATHER_LABEL[kind];
      kind = 'indoor';
      note = `施設の外は${outside}。都市の内部には雨や風が届かない。`; break;
    }
    case 'garhyura':
      if(kind === 'snow' && mean < -12 && roll2 < .5) kind = 'blizzard';
      note = '気候安定化を受けていない、本来の気候。'; break;
    case 'chiriludo-ailtsua':
      // 雪は止んでいる：降るものは描かず、空の様子だけ
      if(kind === 'snow' || kind === 'rain' || kind === 'heavy') kind = 'cloudy';
      note = 'フーモラの管理下で、寒さそのものは保たれている。'; break;
    case 'kyuma':
      if(roll2 < .07) kind = 'sand';
      break;
  }
  if(!note && c.stability) note = `気候：${c.stability}`;

  return {
    kind, label: id === 'maimok' ? 'ピンクの霧' : TD_WEATHER_LABEL[kind], hi, lo, cur, mean, pink: id === 'maimok',
    snowyGround: mean < -1 || ['garhyura','maimok','chiriludo-ailtsua'].includes(id) && mean < 3,
    note, climate: c
  };
}

const tdDeg = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '').replace(/^-0$/, '0') + '℃';
const tdDegInt = v => { const n = Math.round(v); return (n === 0 ? 0 : n) + '℃'; };

/* --------------------------------------------------------------------------
   4. 時間帯（見ている人の時計）
   -------------------------------------------------------------------------- */

// 空の色のキーフレーム [時刻, 上の色, 下の色, 明るさ]
const TD_SKY = [
  [0,    '#070d1f', '#16224a', 0],
  [4.6,  '#0a1230', '#1e2b58', 0],
  [5.4,  '#26386b', '#c98a86', .22],
  [6.3,  '#5b8fcf', '#f3c9a6', .6],
  [7.6,  '#4f9be0', '#cfe5f6', .95],
  [15.6, '#4a95dc', '#d6e9f6', 1],
  [16.8, '#4d79bd', '#f1c895', .78],
  [17.7, '#3b4a8c', '#ee8e68', .45],
  [18.6, '#1d2756', '#5a4f86', .16],
  [19.6, '#0b1433', '#1c2650', .02],
  [24,   '#070d1f', '#16224a', 0]
];

function tdHex(c){ c = c.replace('#',''); if(c.length === 3) c = c.split('').map(x => x + x).join(''); const n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function tdMix(a, b, t){
  const A = tdHex(a), B = tdHex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function tdPhase(now, id, wx){
  const h = now.getHours() + now.getMinutes() / 60;
  let i = 0; while(i < TD_SKY.length - 2 && TD_SKY[i + 1][0] <= h) i++;
  const [h0, t0, b0, l0] = TD_SKY[i], [h1, t1, b1, l1] = TD_SKY[i + 1];
  const f = (h - h0) / (h1 - h0 || 1);
  let top = tdMix(t0, t1, f), bottom = tdMix(b0, b1, f), light = l0 + (l1 - l0) * f;

  // チリルド・アイルツア：白夜・極夜に近い日照
  if(id === 'chiriludo-ailtsua'){
    const m = now.getMonth() + 1;
    if(m === 11 || m === 12 || m === 1){ top = tdMix(top, '#141d45', .7); bottom = tdMix(bottom, '#3f3f78', .6); light = Math.min(light, .28); }
    if(m >= 5 && m <= 7 && light < .4){ top = tdMix(top, '#4a6fb0', .7); bottom = tdMix(bottom, '#e9b9a0', .6); light = Math.max(light, .42); }
  }
  // フーモラ・スカイピル：成層圏なので上空は濃い青
  if(id === 'fumora-skypill'){ top = tdMix(top, '#10236b', .45); }

  // セルトシティ：施設内の管理された照明
  if(id === 'sertcity'){ light = .55 + .45 * light; top = tdMix('#22324a', '#d6e6f2', light); bottom = tdMix('#2c3e58', '#eef4f8', light); }
  // 天気による曇り
  const grey = { cloudy:.45, rain:.55, heavy:.7, snow:.4, blizzard:.75, fog:.7, sand:.6 }[wx && wx.kind] || 0;
  if(grey){
    const g = wx.kind === 'sand' ? '#b59a72' : (wx.kind === 'fog' ? (wx.pink ? '#e9a3c6' : '#aab3bd') : '#8d97a6');
    top = tdMix(top, tdMix('#1a2030', g, light), grey);
    bottom = tdMix(bottom, tdMix('#262c3a', g, light), grey);
  }

  let label;
  if(h < 4.5) label = '深夜'; else if(h < 6.5) label = '夜明け'; else if(h < 10) label = '朝';
  else if(h < 16) label = '昼'; else if(h < 18.5) label = '夕方'; else if(h < 22) label = '夜'; else label = '深夜';
  return { h, top, bottom, light, label };
}

/* --------------------------------------------------------------------------
   5. アイコン
   -------------------------------------------------------------------------- */

function tdIcon(kind, night){
  const sun = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>';
  const moon = '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"/>';
  const cloud = '<path d="M7 18.5h10.2a3.8 3.8 0 0 0 .4-7.6 5.4 5.4 0 0 0-10.4 1.3A3.2 3.2 0 0 0 7 18.5z"/>';
  const P = {
    clear: night ? moon : sun,
    partly: (night ? '<path d="M12.5 8.2A4.6 4.6 0 0 1 7.2 3.6a4.6 4.6 0 1 0 5.3 4.6z"/>' : '<circle cx="8.5" cy="8" r="3.2"/><path d="M8.5 2.6v1.3M3.1 8h1.3M4.7 4.2l.9.9M12.3 4.2l-.9.9"/>') + '<path d="M9 19.5h8.5a3.2 3.2 0 0 0 .3-6.4 4.5 4.5 0 0 0-8.7 1.1A2.7 2.7 0 0 0 9 19.5z"/>',
    cloudy: cloud,
    rain: '<path d="M7 15h10.2a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10 1.2A3 3 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    heavy: '<path d="M7 14h10.2a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10 1.2A3 3 0 0 0 7 14z"/><path d="M7.5 16.5l-1.5 4M11 16.5l-1.5 4M14.5 16.5l-1.5 4M18 16.5l-1.5 4"/>',
    snow: '<path d="M7 14h10.2a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10 1.2A3 3 0 0 0 7 14z"/><circle cx="8.5" cy="18" r=".6"/><circle cx="12" cy="20" r=".6"/><circle cx="15.5" cy="18" r=".6"/>',
    blizzard: '<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5M3 12h16a2.5 2.5 0 1 1-2.5 2.5M3 16h8"/><circle cx="15" cy="19.5" r=".6"/><circle cx="19" cy="9" r=".6"/>',
    fog: '<path d="M4 8.5h16M3 12h18M5 15.5h14M7 19h10"/>',
    sand: '<path d="M3 9c3-2 6 2 9 0s6-2 9 0M3 13c3-2 6 2 9 0s6-2 9 0M3 17c3-2 6 2 9 0"/>',
    managed: '<circle cx="12" cy="12" r="3.4"/><ellipse cx="12" cy="12" rx="9.5" ry="3.6"/>',
    dome: '<path d="M3 18.5a9 9 0 0 1 18 0z"/><path d="M12 9.5v9M7 11.5v7M17 11.5v7M3.8 15h16.4"/>',
    indoor: '<rect x="3.5" y="4" width="17" height="16" rx="1"/><path d="M3.5 8h17M8 20v-7h3v7M13 20v-9h3v9"/>'
  };
  return `<svg class="td-wx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[kind] || P.clear}</svg>`;
}

/* --------------------------------------------------------------------------
   6. トップページ「今日の世界」
   -------------------------------------------------------------------------- */

function tdHomeSection(){
  const now = tdNow();
  const m = now.getMonth() + 1, d = now.getDate();
  const today = tdEventsOn(m, d);
  const next = tdNextEvents(now);

  const evRow = ev => `
    <a class="td-row" href="#/calendar/${ev.id}">
      <span class="td-row-tag">${ev.type}</span>
      <span class="td-row-name">${ev.name}</span>
      <span class="td-row-meta">${tdEventCountries(ev)}</span>
    </a>`;

  let eventsHtml;
  if(today.length){
    eventsHtml = `<div class="td-list">${today.map(evRow).join('')}</div>`;
  } else {
    eventsHtml = `<p class="td-empty">今日は、登録されている行事はありません。</p>`;
  }
  if(next){
    eventsHtml += `
      <div class="td-next">
        <span class="td-next-label">次の行事</span>
        <span class="td-next-when">あと${next.days}日 ・ ${next.month}月${next.day}日</span>
      </div>
      <div class="td-list td-list--next">${next.events.slice(0, today.length ? 2 : 4).map(evRow).join('')}</div>
      ${next.events.length > (today.length ? 2 : 4) ? `<a class="td-more" href="#/calendar">ほか${next.events.length - (today.length ? 2 : 4)}件をカレンダーで見る →</a>` : ''}`;
  }

  const news = tdNews().slice(0, 3).map(n => {
    const c = catByKey(n.category);
    return `
      <a class="td-row td-row--news" href="#/news/${n.id}">
        <span class="td-row-date">${n.updated}</span>
        <span class="td-row-name">${n.title}</span>
        <span class="td-row-meta">${c ? c.name : ''}</span>
      </a>`;
  }).join('');

  return `
    <section class="section td-home">
      <div class="section-inner">
        <div class="section-head">
          <div>
            <div class="section-title">今日の世界</div>
            <div class="section-sub">TODAY — 統合暦 ${now.getFullYear()}.${String(m).padStart(2,'0')}.${String(d).padStart(2,'0')}</div>
          </div>
          <a class="td-room-link" href="#/room">
            ${tdRoomIcon()}
            部屋から今日を見る
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <div class="td-home-grid">
          <div class="td-panel">
            <div class="td-panel-head">
              <span class="td-panel-title">今日の行事</span>
              <span class="td-panel-date">${m}月${d}日</span>
            </div>
            ${eventsHtml}
            <a class="td-foot-link" href="#/calendar">世界カレンダーへ →</a>
          </div>
          <div class="td-panel">
            <div class="td-panel-head">
              <span class="td-panel-title">最新ニュース</span>
              <span class="td-panel-date">WORLD NEWS</span>
            </div>
            <div class="td-list">${news || '<p class="td-empty">ニュースはまだありません。</p>'}</div>
            <a class="td-foot-link" href="#/news">世界ニュースへ →</a>
          </div>
        </div>
      </div>
    </section>`;
}

function tdRoomIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3.5" width="16" height="15" rx="1"/><path d="M12 3.5v15M4 11h16M2.5 21h19"/></svg>`;
}

/* --------------------------------------------------------------------------
   7. 記事ページの逆引き（行事・ニュース）
   -------------------------------------------------------------------------- */

function tdArticleLinks(a){
  if(!a) return '';
  const isNation = a.cat === 'nation';
  const events = tdEvents().filter(ev =>
    ev.articleId === a.id || (isNation && (ev.countries || []).includes(a.title))
  ).sort((x, y) => x.month - y.month || x.day - y.day);
  const news = tdNewsFor(a.id);
  if(!events.length && !news.length) return '';

  const evHtml = events.map(ev => `
    <a class="td-back-row" href="#/calendar/${ev.id}">
      <span class="td-back-date">${ev.month}/${ev.day}</span>
      <span class="td-back-name">${ev.name}</span>
      <span class="td-back-kind">${ev.type}</span>
    </a>`).join('');
  const nwHtml = news.map(n => `
    <a class="td-back-row" href="#/news/${n.id}">
      <span class="td-back-date">${n.updated}</span>
      <span class="td-back-name">${n.title}</span>
      <span class="td-back-kind">ニュース</span>
    </a>`).join('');

  return `
    <h2 id="sec-today-links">${isNation ? 'この国の行事とニュース' : 'この記事にまつわる行事とニュース'}</h2>
    <div class="td-back">
      ${events.length ? `<div class="td-back-group"><div class="td-back-label">世界カレンダー<span>${events.length}件</span></div>${evHtml}</div>` : ''}
      ${news.length ? `<div class="td-back-group"><div class="td-back-label">世界ニュース<span>${news.length}件</span></div>${nwHtml}</div>` : ''}
      ${isNation ? `<a class="td-back-room" href="#/room/${a.id}">${tdRoomIcon()}${a.title}の部屋から今日を見る →</a>` : ''}
    </div>`;
}

/* --------------------------------------------------------------------------
   8. 部屋の窓から見える景色
      国ごとの景色の種類。新しい国を足すときはここに1行追加する
      （書かなかった国は 'plains' になる）
   -------------------------------------------------------------------------- */

const ROOM_VIEW = {
  niporan:'city',            // 山を背にした大都市
  sertcity:'indoor',         // 閉鎖型施設の内部の都市
  hubert:'hillcity',         // 丘陵と緑の多い街
  larliafrus:'forest',       // リフィネスの森
  yuretsuea:'plains',        // 平野と大河
  garhyura:'taiga',          // 針葉樹林と凍土
  maimok:'taiga',            // 霧の針葉樹林
  orgaron:'coast',           // 丘陵と海辺の街
  sanrudo:'goldcoast',       // 沿岸の金融都市
  kyuma:'desert',            // 砂漠と岩
  belnea:'dome',             // 環境ドームの内側
  wonhead:'lake',            // 山脈と湖沼
  'chiriludo-ailtsua':'ice', // 氷河とフィヨルド
  tasumenio:'sea',           // 島と海
  'fumora-skypill':'sky'     // 雲海の上
};

function tdScene(id, now, wx, ph, WW, WH){
  const W = WW || 500, H = WH || 350, L = ph.light;
  const r = tdRand('view:' + id);
  const night = '#0b1226';
  const sh = (c, k) => tdMix(night, c, .18 + .82 * L * (k == null ? 1 : k));
  const snowy = wx && wx.snowyGround;
  const lit = L < .5;
  const out = [];

  const mountains = (y, amp, color, n) => {
    let p = `M0 ${H} L0 ${y}`;
    for(let i = 0; i <= n; i++){ const x = i / n * W; p += ` L${x.toFixed(1)} ${(y - r() * amp).toFixed(1)}`; }
    out.push(`<path d="${p} L${W} ${H}Z" fill="${color}"/>`);
  };
  const hills = (y, amp, color) => {
    const a = r() * 6;
    let p = `M0 ${H} L0 ${y}`;
    for(let x = 0; x <= W; x += 20) p += ` L${x} ${(y - Math.sin(x / 90 + a) * amp - Math.sin(x / 37 + a * 2) * amp * .3).toFixed(1)}`;
    out.push(`<path d="${p} L${W} ${H}Z" fill="${color}"/>`);
  };
  const water = (y, color) => {
    out.push(`<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${color}"/>`);
    for(let i = 0; i < 9; i++){
      const yy = y + 6 + r() * (H - y - 10), x = r() * W;
      out.push(`<line x1="${x.toFixed(0)}" y1="${yy.toFixed(0)}" x2="${(x + 20 + r() * 40).toFixed(0)}" y2="${yy.toFixed(0)}" stroke="${tdMix(color, '#ffffff', .35 * L + .1)}" stroke-width="1.2" opacity=".6"/>`);
    }
  };
  const buildings = (n, yBase, minH, maxH, color, opt) => {
    opt = opt || {};
    let x = -5;
    for(let i = 0; i < n && x < W; i++){
      const w = (opt.w || 22) + r() * (opt.wv || 20), h = minH + r() * (maxH - minH);
      const y = yBase - h;
      out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(h + 2).toFixed(1)}" fill="${color}"/>`);
      if(opt.cap && r() < .4) out.push(`<rect x="${(x + w / 2 - 1).toFixed(1)}" y="${(y - 10).toFixed(1)}" width="2" height="10" fill="${color}"/>`);
      if(lit){
        for(let wy = y + 6; wy < yBase - 6; wy += 9){
          for(let wx2 = x + 4; wx2 < x + w - 5; wx2 += 7){
            if(r() < .32) out.push(`<rect x="${wx2.toFixed(1)}" y="${wy.toFixed(1)}" width="3" height="4" fill="${opt.win || '#cfeaff'}" opacity="${(.55 + r() * .45) * (1 - L * 1.6)}"/>`);
          }
        }
      }
      x += w + (opt.gap != null ? opt.gap : 2 + r() * 6);
    }
  };
  const conifers = (n, yBase, size, color, snowCap) => {
    for(let i = 0; i < n; i++){
      const x = r() * W, s = size * (.6 + r() * .6), y = yBase + r() * 30;
      out.push(`<path d="M${x.toFixed(1)} ${(y - s * 2.4).toFixed(1)} L${(x - s * .8).toFixed(1)} ${y.toFixed(1)} L${(x + s * .8).toFixed(1)} ${y.toFixed(1)}Z" fill="${color}"/>`);
      if(snowCap) out.push(`<path d="M${x.toFixed(1)} ${(y - s * 2.4).toFixed(1)} L${(x - s * .3).toFixed(1)} ${(y - s * 1.5).toFixed(1)} L${(x + s * .3).toFixed(1)} ${(y - s * 1.5).toFixed(1)}Z" fill="${sh('#f2f6fa')}"/>`);
    }
  };
  const canopy = (n, yBase, size, colors) => {
    for(let i = 0; i < n; i++){
      const x = r() * (W + 40) - 20, s = size * (.6 + r() * .7), y = yBase + r() * 40;
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${colors[i % colors.length]}"/>`);
    }
  };
  const ground = (y, c) => out.push(`<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${c}"/>`);
  const G = snowy ? '#e6edf3' : null;

  switch(ROOM_VIEW[id] || 'plains'){
    case 'city':
      mountains(215, 70, sh('#7d93ad', .8), 7);
      buildings(30, 352, 40, 150, sh('#56677f'), { cap:true });
      buildings(24, 352, 20, 70, sh('#3e4b5f'), { w:28, gap:0 });
      break;
    case 'tower':
      buildings(18, 352, 120, 260, sh('#6d7f97', .85), { w:20, wv:14, cap:true });
      buildings(22, 352, 60, 140, sh('#465670'), { w:26, gap:1 });
      canopy(14, 345, 16, [sh('#3f6b55'), sh('#355d49')]);
      break;
    case 'hillcity':
      hills(220, 22, sh(G || '#86a68a', .85));
      buildings(22, 300, 25, 80, sh('#6d7b8e'), { w:24 });
      canopy(26, 305, 20, [sh(G ? '#9fb0a3' : '#4f7a59'), sh(G ? '#b8c4bb' : '#5d8a63')]);
      ground(320, sh(G || '#557a5c'));
      break;
    case 'forest':
      hills(210, 26, sh('#4c7f5a', .8));
      canopy(40, 245, 26, [sh('#2f6b43'), sh('#3a7d4f'), sh('#285c3a')]);
      canopy(30, 300, 32, [sh('#245535'), sh('#2f6a42'), sh('#1d4a2d')]);
      break;
    case 'plains':
      mountains(200, 40, sh('#8ea2b6', .75), 6);
      ground(250, sh(G || '#93a86f'));
      out.push(`<path d="M-10 330 C120 300 200 285 260 268 S420 248 520 255 L520 268 C430 262 330 275 270 284 S120 320 -10 350Z" fill="${sh('#7fa9c8')}"/>`);
      canopy(10, 255, 10, [sh(G ? '#a9b6b0' : '#5f7d4c')]);
      break;
    case 'taiga':
      mountains(215, 35, sh('#a5b3c2', .7), 5);
      ground(258, sh(G || '#c9d4dd'));
      conifers(26, 250, 12, sh('#2e4a3d'), snowy);
      conifers(16, 290, 20, sh('#22392f'), snowy);
      break;
    case 'coast':
      water(250, sh('#5c8fb8'));
      hills(250, 30, sh('#b8a77c', .9));
      buildings(14, 300, 18, 46, sh('#e6ddcf'), { w:20, wv:10, win:'#ffe7c2' });
      ground(298, sh('#9c8f66'));
      canopy(10, 300, 10, [sh('#6c7d4a')]);
      break;
    case 'goldcoast':
      water(262, sh('#4f86b3'));
      buildings(20, 300, 50, 150, sh('#c9b27a'), { w:22, cap:true, win:'#fff1c9' });
      buildings(18, 300, 20, 70, sh('#a88f56'), { w:28, gap:1, win:'#fff1c9' });
      ground(298, sh('#b9a77e'));
      break;
    case 'desert':
      mountains(225, 40, sh('#c99c6b', .85), 4);
      hills(265, 14, sh('#e1bd88'));
      hills(305, 18, sh('#d4a873'));
      out.push(`<ellipse cx="380" cy="320" rx="46" ry="8" fill="${sh('#6d9fa8')}"/>`);
      canopy(5, 312, 9, [sh('#5f7d43')]);
      break;
    case 'dome':
      hills(240, 20, sh('#5c9b74', .85));
      canopy(30, 280, 22, [sh('#3f8a5e'), sh('#4c9a6a'), sh('#2f7550')]);
      water(318, sh('#5aa3a0'));
      // 環境ドームの骨組み
      for(let i = 0; i < 6; i++){
        const x = 40 + i * 85;
        out.push(`<path d="M${x} 0 Q${x + 20} 150 ${x - 10} 360" fill="none" stroke="${tdMix('#dfe9ee', '#ffffff', L)}" stroke-width="1.4" opacity="${.25 + .2 * L}"/>`);
      }
      out.push(`<path d="M-10 60 Q250 10 510 60" fill="none" stroke="#e8f1f4" stroke-width="1.4" opacity="${.25 + .2 * L}"/>`);
      out.push(`<path d="M-10 140 Q250 95 510 140" fill="none" stroke="#e8f1f4" stroke-width="1.2" opacity="${.18 + .15 * L}"/>`);
      break;
    case 'lake':
      mountains(195, 75, sh(G ? '#d7dee6' : '#7b8fa6', .75), 6);
      water(262, sh('#6a9dc4'));
      ground(300, sh(G || '#8aa36a'));
      conifers(10, 290, 12, sh('#355a40'), snowy);
      break;
    case 'ice':
      mountains(200, 60, sh('#dce6ef', .9), 5);
      water(270, sh('#30566f'));
      out.push(`<path d="M0 ${H} L0 230 L90 220 L150 270 L120 ${H}Z" fill="${sh('#eef3f8')}"/>`);
      out.push(`<path d="M${W} ${H} L${W} 215 L410 228 L360 275 L380 ${H}Z" fill="${sh('#e4ecf3')}"/>`);
      for(let i = 0; i < 6; i++) out.push(`<rect x="${(160 + r() * 180).toFixed(0)}" y="${(285 + r() * 50).toFixed(0)}" width="${(10 + r() * 22).toFixed(0)}" height="4" rx="2" fill="${sh('#f4f8fb')}"/>`);
      break;
    case 'sea':
      water(240, sh('#2f8fb7'));
      out.push(`<path d="M300 242 Q340 200 390 242Z" fill="${sh('#4e7b53')}"/>`);
      out.push(`<path d="M40 244 Q70 225 110 244Z" fill="${sh('#5a8a5a')}"/>`);
      out.push(`<path d="M0 ${H} L0 310 Q120 296 220 316 L240 ${H}Z" fill="${sh('#d8c99c')}"/>`);
      canopy(4, 305, 9, [sh('#3e6e44')]);
      break;
    case 'indoor': {
      // 閉鎖型施設の内部：天井のパネル、内部の高層棟、中央のセルトタワー、人工緑地
      const ceil = tdMix('#1d2a40', '#dfe9f2', L);
      out.push(`<rect x="0" y="-40" width="${W}" height="${H + 40}" fill="${tdMix('#24344e', '#cddceb', L)}"/>`);
      out.push(`<rect x="0" y="-40" width="${W}" height="90" fill="${ceil}"/>`);
      for(let x = 0; x <= W; x += 50) out.push(`<line x1="${x}" y1="-40" x2="${x}" y2="50" stroke="${tdMix(ceil, '#000', .12)}" stroke-width="1"/>`);
      for(let x = 25; x < W; x += 100) out.push(`<rect x="${x - 18}" y="40" width="36" height="5" rx="2" fill="#eaf6ff" opacity=".9"/>`);
      out.push(`<rect x="${W / 2 - 16}" y="50" width="32" height="${H}" fill="${sh('#8fa3bb')}"/><rect x="${W / 2 - 4}" y="50" width="8" height="${H}" fill="#4FDAE0" opacity=".5"/>`);
      buildings(16, 352, 90, 220, sh('#7f93ab', .9), { w:24, wv:16 });
      buildings(18, 352, 40, 110, sh('#5b6f88'), { w:30, gap:2 });
      out.push(`<rect x="0" y="296" width="${W}" height="4" fill="#4FDAE0" opacity=".35"/>`);
      canopy(16, 340, 14, [sh('#3f7a5e'), sh('#4f8a6a')]);
      break;
    }
    case 'sky': {
      // 雲海
      for(let i = 0; i < 20; i++){
        const x = r() * (W + 120) - 60, y = 250 + r() * 70, rx = 50 + r() * 70;
        out.push(`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * .32).toFixed(0)}" fill="${tdMix(tdMix('#2b3a66', '#ffffff', L * .9 + .05), ph.bottom, .2)}"/>`);
      }
      out.push(`<rect x="-60" y="320" width="${W + 120}" height="${H - 320}" fill="${tdMix('#2b3a66', '#f4f7fb', L * .9 + .05)}"/>`);
      break;
    }
  }
  return out.join('');
}

/* --------------------------------------------------------------------------
   8b. 窓の景色（全15カ国）
   描き方の決まり：
     ・遠景 → 中景 → 近景を 4〜6 層で重ねる。遠い層ほど空の色（もや）に溶かす
     ・輪郭はなめらかに。でたらめな点や線は散らさない
     ・見せ場（塔・樹・建物）は1つ。空を広く残す
     ・夜は近い建物の窓だけ灯す。光は控えめに
   -------------------------------------------------------------------------- */

function tdLS(W, H, L, ph, seed){
  const r = tdRand('ls:' + seed);
  const N = 1 - L;
  const hz = tdMix(ph.bottom, ph.top, .18);                         // もやの色
  const night = c => tdMix('#0a1022', c, .22 + .78 * L);           // 夜は暗く
  const depth = (c, t) => tdMix(hz, night(c), .04 + .96 * Math.pow(Math.max(0, t), 1.7));  // t: 0=遠い 1=近い（遠いほど強く空に溶ける）
  const defs = [];
  let gid = 0;
  const grad = (c1, c2, horiz) => { const id = `ls-${seed}-${gid++}`; defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="${horiz ? 1 : 0}" y2="${horiz ? 0 : 1}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`); return `url(#${id})`; };
  const rgrad = (c, op) => { const id = `lr-${seed}-${gid++}`; defs.push(`<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${op}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`); return `url(#${id})`; };
  // なめらかな線（Catmull-Rom → ベジェ）
  const smooth = pts => {
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for(let i = 0; i < pts.length - 1; i++){
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  // 山・丘の稜線
  const ridge = (base, amp, n, color, t, opt) => {
    opt = opt || {};
    const ph0 = r() * 10, pts = [];
    for(let i = 0; i <= n; i++){
      const x = -30 + (W + 60) * i / n;
      const v = .55 * Math.sin(i * 1.7 + ph0) + .3 * Math.sin(i * 3.1 + ph0 * 2) + .15 * (r() * 2 - 1);
      pts.push([x, base - amp * (.5 + .5 * v) * (opt.peak ? Math.pow(Math.sin(Math.PI * i / n), .3) : 1)]);
    }
    const top = depth(color, t), bot = depth(tdMix(color, '#000', .18), t);
    return `<path d="${smooth(pts)} L${W + 30} ${H + 10} L-30 ${H + 10}Z" fill="${grad(tdMix(top, '#ffffff', opt.snow ? .5 : 0), bot)}"/>`;
  };
  // もやの帯
  const mist = (y, h, op) => `<rect x="-40" y="${y.toFixed(0)}" width="${W + 80}" height="${h.toFixed(0)}" fill="url(#rm-hz)" opacity="${op}"/>`;
  // 建物（窓は近い層だけ）
  const building = (x, base, w, h, color, t, opt) => {
    opt = opt || {};
    const c = depth(color, t), cd = depth(tdMix(color, '#000', .22), t);
    let s = `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h + 2).toFixed(1)}" fill="${grad(c, cd)}"${opt.rx ? ` rx="${opt.rx}"` : ''}/>`;
    s += `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(w * .18).toFixed(1)}" height="${(h + 2).toFixed(1)}" fill="#ffffff" opacity="${(.08 * L * t).toFixed(3)}"/>`;
    if(opt.roof === 'gable') s += `<path d="M${(x - 2).toFixed(1)} ${(base - h).toFixed(1)} L${(x + w / 2).toFixed(1)} ${(base - h - w * .45).toFixed(1)} L${(x + w + 2).toFixed(1)} ${(base - h).toFixed(1)}Z" fill="${depth(opt.roofColor || '#6a4a3a', t)}"/>`;
    if(opt.roof === 'dome') s += `<path d="M${x.toFixed(1)} ${(base - h).toFixed(1)} A${(w / 2).toFixed(1)} ${(w * .42).toFixed(1)} 0 0 1 ${(x + w).toFixed(1)} ${(base - h).toFixed(1)}Z" fill="${depth(opt.roofColor || '#8aa0b0', t)}"/>`;
    if(opt.spire) s += `<rect x="${(x + w / 2 - .8).toFixed(1)}" y="${(base - h - opt.spire).toFixed(1)}" width="1.6" height="${opt.spire}" fill="${c}"/>`;
    if(opt.win && t > .35){
      const cols = Math.max(1, Math.floor((w - 4) / 6)), rows = Math.max(1, Math.floor((h - 8) / 9));
      const lit = N > .15;
      for(let i = 0; i < rows; i++) for(let k = 0; k < cols; k++){
        if(r() > (lit ? opt.win : .18)) continue;
        s += `<rect x="${(x + 3 + k * 6).toFixed(1)}" y="${(base - h + 6 + i * 9).toFixed(1)}" width="2.6" height="4" fill="${lit ? (opt.winColor || '#ffd9a0') : tdMix(c, '#ffffff', .2)}" opacity="${lit ? (.55 + .45 * N).toFixed(2) : '.35'}"/>`;
      }
    }
    return s;
  };
  // 光のにじみ（夜の街あかり・塔の光）
  const glow = (cx, cy, rx, ry, c, op) => `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="${rgrad(c, op)}"/>`;
  // 針葉樹・広葉樹の並び（規則的なリズム）
  const conifers = (base, size, color, t, gap) => {
    let s = '';
    for(let x = -10; x < W + 20; x += gap * (.8 + r() * .4)){
      const sz = size * (.75 + r() * .5), c = depth(color, t);
      s += `<path d="M${x.toFixed(1)} ${(base - sz * 2.6).toFixed(1)} L${(x - sz * .7).toFixed(1)} ${(base - sz * 1.1).toFixed(1)} L${(x - sz * .4).toFixed(1)} ${(base - sz * 1.1).toFixed(1)} L${(x - sz).toFixed(1)} ${(base + 2).toFixed(1)} L${(x + sz).toFixed(1)} ${(base + 2).toFixed(1)} L${(x + sz * .4).toFixed(1)} ${(base - sz * 1.1).toFixed(1)} L${(x + sz * .7).toFixed(1)} ${(base - sz * 1.1).toFixed(1)}Z" fill="${c}"/>`;
    }
    return s + `<rect x="-20" y="${base}" width="${W + 40}" height="${H - base + 10}" fill="${depth(color, t)}"/>`;
  };
  const canopy = (base, size, color, t, gap) => {
    let s = '';
    for(let x = -20; x < W + 30; x += gap * (.7 + r() * .5)) s += `<circle cx="${x.toFixed(1)}" cy="${(base - size * (.4 + r() * .5)).toFixed(1)}" r="${(size * (.8 + r() * .5)).toFixed(1)}" fill="${depth(color, t)}"/>`;
    return s + `<rect x="-20" y="${(base - size * .3).toFixed(0)}" width="${W + 40}" height="${H}" fill="${depth(color, t)}"/>`;
  };
  // ふわっとした雲（数個だけ）
  const cloud = (x, y, s, op) => {
    const c = tdMix(tdMix('#3a4468', '#ffffff', L * .92 + .05), ph.bottom, .15), cs = tdMix(c, ph.top, .25);
    let p = `<g opacity="${op}">`;
    p += `<ellipse cx="${x}" cy="${y + s * .18}" rx="${s * 1.5}" ry="${s * .32}" fill="${cs}"/>`;
    [[0, 0, .62], [-.6, .12, .45], [.62, .1, .5], [-.25, -.22, .5], [.3, -.2, .42]].forEach(([dx, dy, k]) => { p += `<circle cx="${(x + dx * s).toFixed(0)}" cy="${(y + dy * s).toFixed(0)}" r="${(s * k).toFixed(0)}" fill="${c}"/>`; });
    return p + `</g>`;
  };
  // 建物の列の下を、画面の下まで街並みで埋める（街が浮いて見えないように）
  const ground = (base, color, t) => {
    let g = `<rect x="-30" y="${(base - .5).toFixed(1)}" width="${W + 60}" height="${(H - base + 14).toFixed(1)}" fill="${grad(depth(tdMix(color, '#000', .28), t), depth(tdMix(color, '#000', .4), Math.min(1, t + .1)))}"/>`;
    // 低い屋根の連なりで、ただの帯に見えないようにする
    for(let x = -20; x < W + 20;){ const w = 10 + r() * 18, h = 3 + r() * 7; g += `<rect x="${x.toFixed(1)}" y="${(base + 2 + r() * 6).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${depth(tdMix(color, '#000', .18), t)}" opacity=".7"/>`; x += w + 4 + r() * 10; }
    if(N > .2 && t > .3) for(let i = 0; i < 10; i++) g += `<rect x="${(r() * W).toFixed(1)}" y="${(base + 6 + r() * Math.min(40, H - base - 8)).toFixed(1)}" width="2.4" height="2.4" fill="#ffd9a0" opacity="${(N * .6).toFixed(2)}"/>`;
    return g;
  };
  // 鳥の群れ（昼だけ）
  const birds = (y, n, size, t) => {
    if(L < .3) return '';
    const col = depth('#2a2f3a', t || .6);
    let s = `<g class="rm-fly" style="animation-duration:${(50 + r() * 30).toFixed(0)}s;animation-delay:-${(r() * 50).toFixed(0)}s"><g transform="translate(0 ${y.toFixed(0)})">`;
    for(let i = 0; i < n; i++){
      const bx = (r() - .5) * 60 - i * 6, by = (r() - .5) * 26, sz = size * (.7 + r() * .5);
      s += `<path class="rm-flap" style="animation-delay:-${r().toFixed(2)}s" d="M${bx.toFixed(1)} ${by.toFixed(1)} q${sz} ${-sz} ${sz * 2} 0 q${sz} ${-sz} ${sz * 2} 0" stroke="${col}" stroke-width="${(1 + size * .15).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    }
    return s + `</g></g>`;
  };
  // 飛行機（昼は飛行機雲、夜は点滅灯）
  const plane = (y, sc, dir, dur) => {
    const col = depth('#e8ecf2', .5), cls = dir > 0 ? 'rm-fly' : 'rm-fly-rev';
    let p = `<g class="${cls}" style="animation-duration:${dur || 70}s;animation-delay:-${(r() * (dur || 70)).toFixed(0)}s"><g transform="translate(0 ${y.toFixed(0)}) scale(${dir * sc} ${sc})">`;
    if(L > .3) p += `<line x1="-160" y1="0" x2="-14" y2="0" stroke="#ffffff" stroke-width="2" opacity="${(.45 * L).toFixed(2)}" stroke-linecap="round"/>`;
    p += `<path d="M-14 0 Q-14 -3 -6 -3 L14 -2 Q20 0 14 2 L-6 3 Q-14 3 -14 0Z" fill="${col}"/><path d="M0 -2 L-6 -12 L-1 -12 L6 -2Z M0 2 L-6 10 L-1 10 L6 2Z M-12 -2 L-16 -8 L-13 -8 L-9 -2Z" fill="${col}"/>`;
    if(N > .2) p += `<circle cx="-6" cy="-12" r="1.6" fill="#ff5a5a" class="rm-blink"/><circle cx="16" cy="0" r="1.4" fill="#ffffff" class="rm-blink" style="animation-delay:-.6s"/>`;
    return p + `</g></g>`;
  };
  // 道路と、行き交う車（夜はライト）
  const road = (y, h, t, n) => {
    let s = `<rect x="-20" y="${y.toFixed(1)}" width="${W + 40}" height="${h}" fill="${depth('#3a3e48', t)}"/><rect x="-20" y="${(y + h / 2 - .4).toFixed(1)}" width="${W + 40}" height=".8" fill="${depth('#e8e0c8', t)}" opacity=".5" stroke-dasharray="6 6"/>`;
    for(let i = 0; i < (n || 6); i++){
      const dir = i % 2 ? -1 : 1, ly = y + (dir > 0 ? h * .2 : h * .58), cw = h * 1.1, ch = h * .26;
      const col = ['#e3462e', '#2e7de3', '#f2f2f2', '#e3c22e', '#3a3a40'][Math.floor(r() * 5)];
      s += `<g class="${dir > 0 ? 'rm-fly' : 'rm-fly-rev'}" style="animation-duration:${(16 + r() * 14).toFixed(0)}s;animation-delay:-${(r() * 30).toFixed(0)}s"><rect x="0" y="${ly.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" rx="${(ch / 2).toFixed(1)}" fill="${depth(col, t)}"/>`;
      if(N > .2) s += `<circle cx="${dir > 0 ? cw : 0}" cy="${(ly + ch / 2).toFixed(1)}" r="${(ch * .45).toFixed(1)}" fill="#fff4d0"/><circle cx="${dir > 0 ? 0 : cw}" cy="${(ly + ch / 2).toFixed(1)}" r="${(ch * .35).toFixed(1)}" fill="#ff4a4a"/>`;
      s += `</g>`;
    }
    return s;
  };
  // もりもりした森（大小の丸い樹冠を不規則に重ねる。上側に光）
  const forest = (base, size, color, t, density) => {
    let s = '';
    const c = depth(color, t), cl = depth(tdMix(color, '#ffffff', .18), t), cd = depth(tdMix(color, '#000', .25), t);
    s += `<rect x="-20" y="${(base - size * .4).toFixed(0)}" width="${W + 40}" height="${(H - base + size).toFixed(0)}" fill="${cd}"/>`;
    for(let x = -30; x < W + 30;){
      const rr = size * (.55 + r() * .9), y = base - size * (.2 + r() * .9);
      s += `<circle cx="${x.toFixed(1)}" cy="${(y + rr * .25).toFixed(1)}" r="${rr.toFixed(1)}" fill="${cd}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rr * .92).toFixed(1)}" fill="${c}"/><circle cx="${(x - rr * .3).toFixed(1)}" cy="${(y - rr * .35).toFixed(1)}" r="${(rr * .45).toFixed(1)}" fill="${cl}" opacity="${(.5 + .4 * L).toFixed(2)}"/>`;
      x += rr * (density || .9) * (.6 + r() * .6);
    }
    return s;
  };
  // 街の段：y0（奥）から y1（手前）まで n 段。手前の段ほど建物が大きく、近い色になる
  const cityRows = (y0, y1, n, colors, t0, t1, opt) => {
    const rows = [];
    const baseAt = i => y0 + (y1 - y0) * Math.pow(i / (n - 1), 1.35);
    for(let i = 0; i < n; i++){
      const k = i / (n - 1), base = baseAt(i), t = t0 + (t1 - t0) * k, sc = .4 + 1.7 * k;
      let s = '';
      for(let x = -20 - r() * 20; x < W + 20;){
        const w = opt.w * sc * (.7 + r() * .6), h = opt.h * sc * (.5 + r() * .9);
        if(opt.skip && opt.skip(x + w / 2, k)){ x += w + opt.gap * sc; continue; }
        const roof = opt.roof ? opt.roof(r) : null;
        s += building(x, base, w, h, colors[Math.floor(r() * colors.length)], t, { win: opt.win, winColor: opt.winColor, rx: opt.rx ? opt.rx * sc : 0, roof, roofColor: opt.roofColors ? opt.roofColors[Math.floor(r() * opt.roofColors.length)] : null });
        x += w + opt.gap * sc;
      }
      s += ground(base, colors[0], t);
      rows.push(s);
    }
    rows.baseAt = baseAt;
    return rows;
  };
  const out = [];
  return { r, N, hz, night, depth, ground, cityRows, birds, plane, road, forest, grad, rgrad, smooth, ridge, mist, building, glow, conifers, canopy, cloud, out,
    done: () => `<defs>${defs.join('')}</defs>` + out.join('') };
}

const TD_VIEWS = {};

/* ニポラン：高層階から見る首都・東京。細い格子の塔が見せ場 */
/* セルトシティ：閉鎖型施設の中の街。天井を抜けて伸びるセルトタワー */
TD_VIEWS.sertcity = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'sertcity'), { r, N, out } = v;
  const amb = tdMix('#22324a', '#d6e4f0', .55 + .45 * L);
  out.push(`<rect x="0" y="-40" width="${W}" height="${H + 40}" fill="${v.grad(tdMix(amb, '#ffffff', .2), tdMix(amb, '#8aa0bb', .3))}"/>`);
  // 天井
  const ceil = tdMix('#1d2a40', '#e4edf5', .5 + .5 * L);
  out.push(`<path d="M-10 -40 L${W + 10} -40 L${W + 10} 40 Q${W / 2} 70 -10 40Z" fill="${ceil}"/>`);
  for(let i = 0; i < 7; i++){ const x = W * (i + .5) / 7; out.push(`<rect x="${x - 20}" y="${36 + Math.sin(Math.PI * (i + .5) / 7) * 14}" width="40" height="4" rx="2" fill="#f4fbff" opacity=".95"/>`); }
  const cx = W * .5;
  out.push(`<path d="M${cx - 46} -40 L${cx + 46} -40 L${cx + 40} ${52} L${cx - 40} ${52}Z" fill="${tdMix('#0e1a2e', '#6a8ab0', L * .5)}"/>`);
  // 遠い棟 → 近い棟
  const tc = '#8aa0bb';
  [[.25, 120, 230, 22], [.5, 80, 170, 28], [.8, 40, 110, 36]].forEach(([t, hmin, hmax, wv]) => {
    for(let x = -10; x < W + 10;){ const w = wv * (.7 + r() * .6), h = hmin + r() * (hmax - hmin); if(Math.abs(x + w / 2 - cx) > 50) out.push(v.building(x, H + 2, w, h, tc, t, { win: .3, winColor: '#dff2ff' })); x += w + 4; }
    out.push(v.mist(H * .35, H * .5, .25));
  });
  // 歩行ブリッジ
  [.48, .62].forEach((t, j) => {
    out.push(`<rect x="0" y="${H * t}" width="${W}" height="4" fill="${v.depth('#c8d6e4', .7)}"/><rect x="0" y="${H * t + 4}" width="${W}" height="1" fill="#4FDAE0" opacity=".5"/>`);
    for(let i = 0; i < 4; i++){ const d = (i + j) % 2 ? -1 : 1; out.push(`<g class="${d > 0 ? 'rm-fly' : 'rm-fly-rev'}" style="animation-duration:${14 + i * 4}s;animation-delay:-${i * 5 + j * 3}s"><rect x="0" y="${H * t - 5}" width="14" height="5" rx="2.5" fill="${v.depth('#f4fbff', .75)}"/><rect x="${d > 0 ? 11 : 0}" y="${H * t - 4}" width="3" height="3" fill="#4FDAE0"/></g>`); }
  });
  // セルトタワー
  out.push(v.glow(cx, H * .5, 70, H * .7, '#4fdaff', .35));
  out.push(`<path d="M${cx - 26} ${H + 4} L${cx - 18} 30 L${cx - 9} -40 L${cx + 9} -40 L${cx + 18} 30 L${cx + 26} ${H + 4}Z" fill="${v.grad('#2a3a52', '#101826', true)}"/>`);
  out.push(`<rect x="${cx - 3}" y="-40" width="6" height="${H + 44}" fill="#9ff0ff" class="rm-beam"/>`);
  for(let y = 70; y < H; y += 30) out.push(`<rect x="${cx - 20}" y="${y}" width="40" height="1.5" fill="#e8f4ff" opacity=".45"/>`);
  // 人工緑地
  out.push(v.canopy(H + 2, 10, '#3f7a5e', .95, 18));
  return v.done();
};

/* ヒューバート：白い研究都市ハーネンス中央都市。中央の研究塔と光の紋章 */
/* ラリアフルス：リフランの郊外から。霧の丘の向こうの丘に月脈樹、根元にリフランの灯。夜は大きな月 */
TD_VIEWS.larliafrus = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'larliafrus'), { r, N, out } = v;
  if(N > .3){
    const mx = W * .2, my = H * .2;
    out.push(v.glow(mx, my, 90, 90, '#e6ecff', (N * .4).toFixed(2)));
    out.push(`<circle cx="${mx}" cy="${my}" r="32" fill="#f3f2ff" opacity="${N.toFixed(2)}"/><circle cx="${mx - 8}" cy="${my - 6}" r="6" fill="#d6d8ee" opacity="${(N * .5).toFixed(2)}"/><circle cx="${mx + 9}" cy="${my + 7}" r="4.5" fill="#d6d8ee" opacity="${(N * .5).toFixed(2)}"/>`);
  } else out.push(v.cloud(W * .2, H * .18, 26, .8));
  const hill = L > .5 ? '#5f8f68' : '#2c3760';
  out.push(v.ridge(H * .58, 30, 9, hill, .1));
  out.push(v.mist(H * .48, 50, .7));
  // 月脈樹（遠くの丘に立つ大樹）
  const tx = W * .64, base = H * .6, crx = W * .17, cry = H * .15, cy0 = base - cry - 26;
  const glowK = .35 + .65 * N;
  const leaf = tdMix(v.depth('#c8e0d0', .92), '#dbe6ff', N);
  const bark = tdMix(v.depth('#6f7a86', .92), '#56628f', N);
  out.push(v.glow(tx, cy0, crx * 1.8, cry * 1.9, tdMix('#ffffff', '#c6d4ff', N), (glowK * .55).toFixed(2)));
  out.push(`<path d="M${tx - 22} ${base} C${tx - 10} ${base - 12} ${tx - 8} ${cy0 + 30} ${tx - 9} ${cy0 + 14} L${tx + 9} ${cy0 + 14} C${tx + 8} ${cy0 + 30} ${tx + 10} ${base - 12} ${tx + 24} ${base}Z" fill="${bark}"/>`);
  [[-1, .9], [1, .9], [-1, .55], [1, .55], [0, .9]].forEach(([d, k]) => out.push(`<path d="M${tx} ${cy0 + 18} Q${tx + d * crx * k * .5} ${cy0 - 4} ${tx + d * crx * k} ${cy0 - cry * (d ? .2 : .9)}" stroke="${bark}" stroke-width="2.4" fill="none"/>`));
  // 樹冠：大きな塊を3段で重ねる（影 → 葉 → 月の光の当たる面）
  const crown = (dx, dy, k, c, op) => `<ellipse cx="${(tx + dx * crx).toFixed(1)}" cy="${(cy0 + dy * cry).toFixed(1)}" rx="${(crx * k).toFixed(1)}" ry="${(cry * k * .8).toFixed(1)}" fill="${c}" opacity="${op}"/>`;
  [[-.55, .2, .62], [.55, .22, .6], [0, -.15, .8], [-.3, -.3, .55], [.32, -.28, .52], [0, .3, .7]].forEach(([dx, dy, k]) => out.push(crown(dx, dy, k, tdMix(tdMix(leaf, '#6f8a80', L * .45), '#4a5888', N * .45), .9)));
  [[-.4, .05, .5], [.4, .05, .5], [0, -.25, .6], [-.1, .2, .5]].forEach(([dx, dy, k]) => out.push(crown(dx, dy, k, leaf, .8)));
  [[-.25, -.35, .35], [.15, -.42, .3], [-.5, -.1, .25]].forEach(([dx, dy, k]) => out.push(crown(dx, dy, k, tdMix(leaf, '#ffffff', .45), .75)));
  for(let i = 0; i < 30; i++){ const x = tx + (r() - .5) * crx * 1.6, y = cy0 + cry * (.25 + r() * .3); out.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 8 + r() * 18).toFixed(1)}" stroke="#eef4ff" stroke-width=".6" opacity="${(glowK * .55).toFixed(2)}"/>`); }
  // 根元のリフランの灯
  if(N > .15){ out.push(v.glow(tx, base + 4, crx * 1.4, 14, '#ffcf7a', (N * .6).toFixed(2))); for(let i = 0; i < 40; i++) out.push(`<circle cx="${(tx + (r() - .5) * crx * 2.4).toFixed(1)}" cy="${(base + 2 + r() * 8).toFixed(1)}" r="${(.6 + r() * .8).toFixed(1)}" fill="#ffe0a0" opacity="${(N * (.5 + r() * .5)).toFixed(2)}"/>`); }
  out.push(v.ridge(H * .7, 26, 8, hill, .4));
  out.push(v.mist(H * .62, 50, .6));
  out.push(v.ridge(H * .8, 22, 7, hill, .65));
  out.push(v.mist(H * .74, 40, .4));
  out.push(v.forest(H * .92, 22, L > .5 ? '#3f7048' : '#18223e', .8, .8));
  out.push(v.forest(H + 14, 34, L > .5 ? '#2f5a3a' : '#111a32', .95, .75));
  // 窓の左右から張り出す大きな樹（手前）
  const fc = v.depth(L > .5 ? '#2a5234' : '#0e162c', 1), fcl = v.depth(L > .5 ? '#3f7a48' : '#1a2644', 1);
  out.push(`<rect x="10" y="${H * .3}" width="14" height="${H}" fill="${v.depth('#3a2a1e', 1)}"/>`);
  [[-10, H * .1, 60], [40, H * .02, 46], [-20, H * .32, 54], [30, H * .26, 40]].forEach(([x, y, rr]) => out.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="${fc}"/><circle cx="${x - rr * .3}" cy="${y - rr * .3}" r="${rr * .5}" fill="${fcl}" opacity=".7"/>`));
  [[W + 10, H * .06, 56], [W - 30, -10, 44], [W + 20, H * .28, 50]].forEach(([x, y, rr]) => out.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="${fc}"/><circle cx="${x - rr * .3}" cy="${y - rr * .3}" r="${rr * .5}" fill="${fcl}" opacity=".7"/>`));
  out.push(v.birds(H * .3, 5, 3.5, .5));
  return v.done();
};

/* ユーレツェア：首都ミレタッツァ。石と金属の街並み、中央に時計塔ツェンタル・ネヘタ */
/* ガルヒューラ：煤煙に覆われた首都ガロラン。赤い空、黒い塔、雪 */
TD_VIEWS.garhyura = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'garhyura'), { r, N, out } = v;
  out.push(`<rect x="0" y="-40" width="${W}" height="${H + 40}" fill="url(#rm-redsky)"/>`);
  const red = '#ff2a20';
  const layer = (t, hmin, hmax, wv, base, c) => {
    for(let x = -10; x < W + 10;){
      const w = wv * (.7 + r() * .6), h = hmin + r() * (hmax - hmin), cc = tdMix('#c42a1e', c, t);
      out.push(`<rect x="${x.toFixed(0)}" y="${(base - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${cc}"/>`);
      if(r() < .6) out.push(`<rect x="${(x + w * .25).toFixed(0)}" y="${(base - h - 12).toFixed(0)}" width="${(w * .5).toFixed(0)}" height="12" fill="${cc}"/>`);
      if(t > .4) out.push(`<rect x="${(x + 2).toFixed(0)}" y="${(base - h + 6).toFixed(0)}" width="1.4" height="${(h - 6).toFixed(0)}" fill="${red}" opacity="${(.4 + .4 * t).toFixed(2)}"/>`);
      x += w + 3;
    }
    out.push(`<rect x="-20" y="${base - 30}" width="${W + 40}" height="60" fill="url(#rm-hz)" opacity=".55"/>`);
  };
  layer(.25, 120, 220, 26, H * .78, '#2a0e10');
  layer(.6, 150, 280, 34, H * .92, '#160809');
  // 煙突と煤煙
  [[W * .18, H * .45], [W * .76, H * .38]].forEach(([x, y], i) => {
    out.push(`<rect x="${x - 6}" y="${y}" width="12" height="${H - y}" fill="#0d0809"/>`);
    for(let k = 0; k < 4; k++) out.push(`<ellipse class="rm-smoke" style="animation-delay:-${k * 2 + i}s" cx="${x}" cy="${y - 8}" rx="16" ry="12" fill="#3a2426" opacity=".6"/>`);
  });
  layer(.95, 30, 70, 70, H + 4, '#0a0606');
  for(let i = 0; i < 36; i++) out.push(`<circle class="rm-snow" cx="${(r() * W).toFixed(0)}" cy="${(r() * H).toFixed(0)}" r="${(.7 + r() * .9).toFixed(1)}" fill="#f2e6e6" style="animation-delay:-${(r() * 6).toFixed(1)}s;animation-duration:${(7 + r() * 4).toFixed(1)}s"/>`);
  return v.done();
};

/* マイモック：ホテルの窓から見下ろすマルネアの通り。ピンクのネオンと霧 */
TD_VIEWS.maimok = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'maimok'), { r, N, out } = v;
  const vx = W * .5, vy = H * .5, g = .7 + .3 * N;
  out.push(`<rect x="0" y="-40" width="${W}" height="${H + 40}" fill="url(#rm-pinksky)"/>`);
  // 奥のビル群（霧に溶ける）
  for(let i = 0; i < 9; i++){ const x = vx - 80 + i * 18 + r() * 6, w = 14 + r() * 8, h = 70 + r() * 120; out.push(`<rect x="${x.toFixed(0)}" y="${(vy - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#8a4a82" opacity=".45"/>`); }
  out.push(v.glow(vx, vy - 20, 160, 90, '#ff8fd0', .55));
  // 左右の壁（遠近）と大きなネオン看板
  [-1, 1].forEach(side => {
    const near = side < 0 ? -10 : W + 10, far = vx + side * 50;
    out.push(`<path d="M${near} -40 L${far} ${vy - 140} L${far} ${vy + 10} L${near} ${H + 10}Z" fill="${v.grad(side < 0 ? '#2a1030' : '#341440', side < 0 ? '#3a1640' : '#24102c', true)}"/>`);
    for(let k = 1; k < 7; k++){ const t = k / 7; out.push(`<path d="M${near} ${-40 + (H + 50) * t} L${far} ${vy - 140 + 150 * t}" stroke="#4a2050" stroke-width="1"/>`); }
    [[.18, .3, .14, '#ff3fb0'], [.42, .55, .1, '#ff9fdc'], [.62, .25, .08, '#c86aff'], [.3, .75, .1, '#ffe0f2']].forEach(([t, yk, hk, c]) => {
      const x = near + (far - near) * t, top = -40 + (vy - 140 + 40) * t, bot = H + 10 + (vy + 10 - H - 10) * t;
      const y = top + (bot - top) * yk, hh = (bot - top) * hk, ww = Math.abs(far - near) * (1 - t) * .09 + 3;
      const xx = side < 0 ? x : x - ww;
      out.push(`<rect x="${(xx - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="${(ww + 8).toFixed(1)}" height="${(hh + 8).toFixed(1)}" fill="${c}" opacity="${(g * .5).toFixed(2)}" filter="url(#rm-blur8)"/><rect x="${xx.toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5" fill="${c}" opacity="${g.toFixed(2)}"/>`);
    });
  });
  for(let i = 0; i < 4; i++){ const y = 30 + i * 30; out.push(`<path d="M-10 ${y} Q${vx} ${y + 34} ${W + 10} ${y + 8}" stroke="#16081a" stroke-width="1.3" fill="none"/>`); }
  // 濡れた路面と映り込み、放置された車
  out.push(`<path d="M${vx - 50} ${vy + 10} L${vx + 50} ${vy + 10} L${W + 80} ${H + 10} L-80 ${H + 10}Z" fill="${v.grad('#4a1c48', '#2a0e28')}"/>`);
  out.push(`<path d="M${vx - 10} ${vy + 12} L${vx + 10} ${vy + 12} L${vx + 120} ${H + 10} L${vx - 120} ${H + 10}Z" fill="#ff7ac8" opacity="${(g * .22).toFixed(2)}" filter="url(#rm-blur8)"/>`);
  [[W * .26, H * .9, 1.4], [W * .7, H * .82, 1.1], [W * .44, H * .66, .6]].forEach(([x, y, s]) => out.push(`<path d="M${x - 36 * s} ${y} L${x - 32 * s} ${y - 12 * s} L${x - 15 * s} ${y - 22 * s} L${x + 17 * s} ${y - 22 * s} L${x + 32 * s} ${y - 12 * s} L${x + 36 * s} ${y}Z" fill="#1a0c1e"/><path d="M${x - 13 * s} ${y - 20 * s} L${x + 15 * s} ${y - 20 * s} L${x + 26 * s} ${y - 12 * s} L${x - 26 * s} ${y - 12 * s}Z" fill="#ff9fdc" opacity=".28"/>`));
  out.push(`<rect x="0" y="-40" width="${W}" height="${H + 40}" fill="#ff9fd0" opacity="${(.06 + .3 * L).toFixed(2)}"/>`);
  return v.done();
};

/* オルガロン：首都フォルネータ。運河沿いの色とりどりの建物、大劇場、バルベルクの塔 */
TD_VIEWS.orgaron = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'orgaron'), { r, N, out } = v;
  const pastel = ['#f2c6b4', '#f4e2a8', '#b8d8e8', '#c8e2c0', '#e8c6e0', '#f6f0e4', '#f0b8a0'];
  out.push(v.cloud(W * .7, H * .14, 28, .75), v.cloud(W * .15, H * .2, 20, .6));
  out.push(v.plane(H * .1, .6, 1, 90));
  out.push(v.ridge(H * .48, 34, 9, '#b8a77c', .15));
  out.push(`<rect x="-20" y="${H * .47}" width="${W + 40}" height="12" fill="${v.depth('#6f9ac0', .2)}"/>`);
  out.push(v.mist(H * .4, 60, .6));
  // バルベルクの塔
  const tx = W * .2, base = H * .78, top = H * .12;
  out.push(`<path d="M${tx - 20} ${base} L${tx - 13} ${top} L${tx + 13} ${top} L${tx + 20} ${base}Z" fill="${v.grad(v.depth('#e2d6c2', .5), v.depth('#b8a888', .5), true)}"/>`);
  ['#e3462e', '#2e7de3', '#e3c22e', '#3ab36a', '#9b4ad6', '#ff7ab0'].forEach((c, i) => out.push(`<rect x="${tx - 16 + i * .6}" y="${top + 14 + i * 30}" width="${32 - i * 1.2}" height="9" fill="${c}" opacity="${(.6 + .35 * N).toFixed(2)}"/>`));
  out.push(`<path d="M${tx - 18} ${top} L${tx} ${top - 26} L${tx + 18} ${top}Z" fill="${v.depth('#7a5a6a', .5)}"/>`);
  if(N > .2) out.push(v.glow(tx, H * .45, 40, H * .4, '#ff9ad0', (N * .35).toFixed(2)));
  // 中景：色とりどりの運河沿いの建物
  for(let x = -10; x < W + 10;){ const w = 24 + r() * 18, h = 50 + r() * 50; out.push(v.building(x, H * .8, w, h, pastel[Math.floor(r() * pastel.length)], .55, { roof: r() < .5 ? 'gable' : null, roofColor: '#b2483a', win: .4, winColor: '#ffe2b0' })); x += w + 1; }
  out.push(v.ground(H * .8, '#c8b8a0', .55));
  // フォルネータ大劇場
  const gx = W * .62, gy = H * .8;
  out.push(`<rect x="${gx - 90}" y="${gy - 64}" width="180" height="66" fill="${v.grad(v.depth('#f6efe4', .7), v.depth('#d8ccb8', .7))}"/>`);
  for(let i = 0; i < 9; i++) out.push(`<rect x="${gx - 82 + i * 20}" y="${gy - 56}" width="7" height="58" fill="${v.depth('#d2c4ac', .7)}"/>`);
  out.push(`<path d="M${gx - 98} ${gy - 64} L${gx} ${gy - 92} L${gx + 98} ${gy - 64}Z" fill="${v.depth('#e6dac6', .7)}"/><path d="M${gx - 50} ${gy - 90} A50 40 0 0 1 ${gx + 50} ${gy - 90}Z" fill="${v.grad(v.depth('#8ab4cc', .7), v.depth('#5a8aa8', .7))}"/>`);
  out.push(`<rect x="${gx - 74}" y="${gy - 52}" width="22" height="46" fill="#e3462e" opacity=".85"/><rect x="${gx + 52}" y="${gy - 52}" width="22" height="46" fill="#2e7de3" opacity=".85"/>`);
  if(N > .2) out.push(v.glow(gx, gy - 40, 130, 60, '#ffd38a', (N * .5).toFixed(2)));
  // 運河と映り込み
  const cy = H * .82;
  out.push(`<rect x="-10" y="${cy}" width="${W + 20}" height="${H - cy + 10}" fill="${v.grad(v.depth('#4a7a9a', .85), v.depth('#2a4a62', .9))}"/><rect x="-10" y="${cy - 3}" width="${W + 20}" height="4" fill="${v.depth('#c8b898', .85)}"/>`);
  for(let i = 0; i < 6; i++) out.push(`<rect x="${(W * i / 6 + 10).toFixed(0)}" y="${(cy + 10 + (i % 3) * 12).toFixed(0)}" width="${30 + (i % 2) * 20}" height="1.5" fill="${N > .3 ? ['#ffd38a', '#ff9ad0', '#9fd8ff'][i % 3] : '#ffffff'}" opacity="${(.35 + .3 * N).toFixed(2)}"/>`);
  out.push(`<path d="M${W * .38} ${cy + 26} L${W * .5} ${cy + 26} L${W * .48} ${cy + 33} L${W * .4} ${cy + 33}Z" fill="${v.depth('#3a2a30', .9)}"/>`);
  out.push(v.birds(H * .3, 5, 3.5, .7));
  out.push(`<g class="rm-fly" style="animation-duration:120s;animation-delay:-40s"><path d="M0 ${H * .88} l40 0 l-4 7 l-32 0Z" fill="${v.depth('#3a2a30', .9)}"/><rect x="14" y="${H * .88 - 8}" width="10" height="8" fill="${v.depth('#e3462e', .9)}"/></g>`);
  return v.done();
};

/* キューマ：首都エータル。砂漠の台地、空中都市遺構と天翼紋の門、円形討議場、蒸気鉄道、発掘現場 */
TD_VIEWS.kyuma = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'kyuma'), { r, N, out } = v;
  out.push(v.cloud(W * .78, H * .12, 20, .5));
  out.push(v.plane(H * .06, .55, -1, 100));
  // 遠景：台地（メサ）と、その上の空中都市遺構
  const mesa = v.depth('#c08a5a', .15);
  out.push(`<path d="M-20 ${H * .52} L${W * .1} ${H * .52} L${W * .14} ${H * .36} L${W * .42} ${H * .36} L${W * .46} ${H * .52} L${W * .7} ${H * .52} L${W * .73} ${H * .42} L${W * .9} ${H * .42} L${W * .93} ${H * .52} L${W + 20} ${H * .52} L${W + 20} ${H} L-20 ${H}Z" fill="${v.grad(mesa, v.depth('#a06a42', .2))}"/>`);
  const ruin = v.depth('#d8c0a0', .25);
  // 崩れたアーチと柱、浮かぶ遺構の破片
  out.push(`<path d="M${W * .18} ${H * .36} L${W * .18} ${H * .24} Q${W * .24} ${H * .14} ${W * .3} ${H * .24} L${W * .3} ${H * .36} L${W * .28} ${H * .36} L${W * .28} ${H * .26} Q${W * .24} ${H * .19} ${W * .2} ${H * .26} L${W * .2} ${H * .36}Z" fill="${ruin}"/>`);
  [[W * .34, H * .26, 6], [W * .38, H * .3, 5]].forEach(([x, y, w]) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${H * .36 - y}" fill="${ruin}"/>`));
  out.push(`<g class="rm-float"><path d="M${W * .3} ${H * .14} l30 -6 l14 8 l-36 6Z" fill="${ruin}"/><path d="M${W * .4} ${H * .1} l18 -3 l8 6 l-22 3Z" fill="${ruin}" opacity=".9"/></g>`);
  // 天翼紋（翼の紋様）
  out.push(`<path d="M${W * .24} ${H * .2} q-8 -4 -12 2 q6 0 12 4 q6 -4 12 -4 q-4 -6 -12 -2Z" fill="${tdMix(v.depth('#f6e2b0', .3), '#ffe8a0', N)}" opacity="${(.6 + .4 * N).toFixed(2)}"/>`);
  out.push(v.mist(H * .44, 60, .55));
  // 中景：エータルの街（砂岩、円形討議場、研究塔）
  for(let x = -10; x < W + 10;){ const w = 22 + r() * 22, h = 22 + r() * 34; out.push(v.building(x, H * .74, w, h, '#e0c49a', .55, { roof: r() < .35 ? 'dome' : null, roofColor: '#c8a070', win: .35, winColor: '#ffd9a0' })); x += w + 2; }
  out.push(v.ground(H * .74, '#e0c49a', .55));
  const fx = W * .66;
  out.push(`<ellipse cx="${fx}" cy="${H * .7}" rx="70" ry="16" fill="${v.depth('#d8b88a', .6)}"/><rect x="${fx - 70}" y="${H * .62}" width="140" height="${H * .08}" fill="${v.grad(v.depth('#ecd4a8', .6), v.depth('#c8a878', .6))}"/><ellipse cx="${fx}" cy="${H * .62}" rx="70" ry="14" fill="${v.depth('#f2dcb0', .6)}"/>`);
  for(let i = 0; i < 9; i++) out.push(`<rect x="${fx - 64 + i * 16}" y="${H * .63}" width="6" height="${H * .06}" fill="${v.depth('#b8986a', .6)}"/>`);
  out.push(`<rect x="${W * .86 - 9}" y="${H * .34}" width="18" height="${H * .4}" fill="${v.grad(v.depth('#e8d0a8', .55), v.depth('#b89870', .55), true)}"/><path d="M${W * .86 - 12} ${H * .34} L${W * .86} ${H * .27} L${W * .86 + 12} ${H * .34}Z" fill="${v.depth('#9a7a4a', .55)}"/>`);
  out.push(v.mist(H * .66, 30, .25));
  // 蒸気鉄道（高架を走る復元の蒸気機関車）
  const ry = H * .79;
  out.push(`<rect x="-10" y="${ry}" width="${W + 20}" height="5" fill="${v.depth('#8a6a4a', .8)}"/>`);
  for(let x = 10; x < W; x += 46) out.push(`<path d="M${x} ${ry + 5} L${x + 6} ${ry + 5} L${x + 6} ${H + 4} L${x} ${H + 4}Z M${x - 20} ${ry + 5} Q${x + 3} ${ry + 24} ${x + 26} ${ry + 5}" fill="${v.depth('#9a7a58', .8)}"/>`);
  out.push(`<g class="rm-train"><rect x="${W * .3}" y="${ry - 14}" width="44" height="14" rx="2" fill="${v.depth('#2a2a30', .85)}"/><rect x="${W * .3 + 30}" y="${ry - 22}" width="12" height="9" fill="${v.depth('#2a2a30', .85)}"/><rect x="${W * .3 + 6}" y="${ry - 20}" width="5" height="7" fill="${v.depth('#2a2a30', .85)}"/><rect x="${W * .3 - 40}" y="${ry - 12}" width="36" height="12" rx="2" fill="${v.depth('#7a3a2a', .85)}"/><rect x="${W * .3 - 80}" y="${ry - 12}" width="36" height="12" rx="2" fill="${v.depth('#7a3a2a', .85)}"/>${[0, 1, 2].map(k => `<ellipse class="rm-steam2" style="animation-delay:-${k}s" cx="${W * .3 + 8}" cy="${ry - 26}" rx="${8 + k * 3}" ry="6" fill="#ffffff" opacity=".7"/>`).join('')}${N > .2 ? `<circle cx="${W * .3 + 46}" cy="${ry - 8}" r="2" fill="#ffe2a8"/>` : ''}</g>`);
  // 近景：砂丘と発掘現場
  out.push(`<path d="${v.smooth([[-20, H * .9], [W * .25, H * .86], [W * .55, H * .92], [W * .8, H * .87], [W + 20, H * .9]])} L${W + 20} ${H + 10} L-20 ${H + 10}Z" fill="${v.grad(v.depth('#e8c48a', .95), v.depth('#c89a62', .95))}"/>`);
  const ex = W * .16, ey = H * .93;
  out.push(`<rect x="${ex - 40}" y="${ey - 6}" width="80" height="14" fill="${v.depth('#a8784a', .95)}"/>`);
  for(let i = 0; i <= 4; i++) out.push(`<line x1="${ex - 40 + i * 20}" y1="${ey - 6}" x2="${ex - 40 + i * 20}" y2="${ey + 8}" stroke="#f6efe0" stroke-width=".8"/>`);
  out.push(`<path d="M${ex + 50} ${ey} L${ex + 66} ${ey - 20} L${ex + 82} ${ey}Z" fill="${v.depth('#f0e6d0', .95)}"/>`);
  out.push(v.birds(H * .22, 3, 4.5, .5));
  return v.done();
};

/* サンルド：首都ラルウォット。左に黄金のヴォルグレン、右に白金のクレディア、中央に中央均衡銀行 */
/* ベルネア：セントラルドームの中から。頭上の骨組み、人工森林、遠くに並ぶ5つのドーム */
TD_VIEWS.belnea = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'belnea'), { r, N, out } = v;
  // ドームの向こうの砂漠と、並ぶドーム
  out.push(v.ridge(H * .55, 16, 8, '#d8b07a', .15));
  out.push(v.mist(H * .48, 50, .5));
  [[.12, 40, '#4f9a5a', 'トロピカル'], [.32, 30, '#e0b06a', 'デザート'], [.52, 44, '#dfeef6', 'アークティック'], [.72, 50, '#3a8ac8', 'オーシャン'], [.9, 34, '#8ac07a', 'テンペレート']].forEach(([k, rr, c]) => {
    const x = W * k, y = H * .56;
    out.push(`<path d="M${x - rr} ${y} A${rr} ${rr * .8} 0 0 1 ${x + rr} ${y}Z" fill="${v.depth(c, .5)}" opacity=".9"/><path d="M${x - rr} ${y} A${rr} ${rr * .8} 0 0 1 ${x + rr} ${y}Z" fill="#ffffff" opacity=".18"/>`);
    out.push(`<path d="M${x - rr * .6} ${y - rr * .62} A${rr} ${rr * .8} 0 0 1 ${x + rr * .2} ${y - rr * .78}" stroke="#ffffff" stroke-width="1.2" fill="none" opacity=".5"/>`);
    if(N > .2) out.push(v.glow(x, y - rr * .3, rr * 1.3, rr * .8, c, (N * .5).toFixed(2)));
  });
  // 人工森林と水路
  out.push(v.canopy(H * .78, 18, '#3f8a5e', .55, 24));
  out.push(v.mist(H * .68, 30, .3));
  out.push(`<rect x="-10" y="${H * .82}" width="${W + 20}" height="${H * .2}" fill="${v.grad(v.depth('#5aa3a0', .8), v.depth('#2f6f74', .85))}"/>`);
  for(let i = 0; i < 5; i++) out.push(`<rect x="${(W * i / 5 + 20).toFixed(0)}" y="${(H * .86 + (i % 2) * 10).toFixed(0)}" width="40" height="1.5" fill="#ffffff" opacity=".4"/>`);
  out.push(v.canopy(H + 6, 14, '#2f7550', .95, 20));
  // 頭上の骨組み
  const beam = tdMix('#ffffff', '#cfe6ff', N);
  for(let i = -2; i <= 2; i++) out.push(`<path d="M${W / 2 + i * W * .3} -40 Q${W / 2 + i * W * .16} ${H * .2} ${W / 2 + i * W * .5} ${H * .6}" stroke="${beam}" stroke-width="2" fill="none" opacity="${(.3 + .2 * L).toFixed(2)}"/>`);
  [H * .05, H * .18].forEach(y => out.push(`<path d="M-20 ${y + 30} Q${W / 2} ${y - 30} ${W + 20} ${y + 30}" stroke="${beam}" stroke-width="1.6" fill="none" opacity="${(.25 + .2 * L).toFixed(2)}"/>`));
  out.push(v.birds(H * .3, 5, 3.5, .6), v.birds(H * .45, 3, 2.5, .4));
  return v.done();
};

/* ヲンヘード：首都イーテスタ。山と湖の手前に巨大市場、百層屋台街、湯気 */
/* チリルド・アイルツア：首都ホクナルツア。氷河、氷の建物、数百年分の氷彫刻。雪は止んでいる */
TD_VIEWS['chiriludo-ailtsua'] = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'chiriludo'), { r, N, out } = v;
  out.push(v.ridge(H * .5, 70, 8, '#e6eff6', .15, { snow: true, peak: true }));
  out.push(v.mist(H * .42, 60, .6));
  out.push(`<rect x="-20" y="${H * .5}" width="${W + 40}" height="${H * .5 + 10}" fill="${v.grad(v.depth('#f2f7fb', .5), v.depth('#dfe9f2', .7))}"/>`);
  // フィヨルドの水
  out.push(`<path d="M${W * .52} ${H * .5} L${W * .7} ${H * .5} L${W * .9} ${H * .66} L${W * .42} ${H * .66}Z" fill="${v.grad(v.depth('#4a7090', .45), v.depth('#2f5068', .5))}"/>`);
  const ice = (d, t) => `<path d="${d}" fill="url(#rm-ice)" opacity="${(.75 + .25 * t).toFixed(2)}" stroke="#ffffff" stroke-width="1" stroke-opacity=".8"/>`;
  // 中景：氷の建物（遠いものは小さく、もやに溶ける）
  [[.12, .58, 30, 70], [.26, .6, 22, 50], [.36, .58, 26, 90], [.78, .6, 24, 60], [.92, .58, 30, 80]].forEach(([k, b, w, h]) => {
    const x = W * k, y = H * b;
    out.push(ice(`M${x - w / 2} ${y} L${x - w / 2} ${y - h * .6} L${x - w / 4} ${y - h * .8} L${x} ${y - h} L${x + w / 4} ${y - h * .8} L${x + w / 2} ${y - h * .6} L${x + w / 2} ${y}Z`, .5));
    if(N > .3) out.push(v.glow(x, y - h * .5, w, h * .6, '#9fd0ff', (N * .3).toFixed(2)));
  });
  out.push(v.mist(H * .52, 30, .35));
  // 氷の回廊（天界氷廊）
  const ax = W * .58, ay = H * .8;
  out.push(ice(`M${ax - 80} ${ay} L${ax - 80} ${ay - 44} Q${ax} ${ay - 100} ${ax + 80} ${ay - 44} L${ax + 80} ${ay} L${ax + 64} ${ay} L${ax + 64} ${ay - 38} Q${ax} ${ay - 80} ${ax - 64} ${ay - 38} L${ax - 64} ${ay}Z`, 1));
  // 手前の大きな氷彫刻（翼のかたち）
  const sx = W * .2, sy = H * .92;
  out.push(ice(`M${sx - 8} ${sy} L${sx - 10} ${sy - 60} C${sx - 40} ${sy - 80} ${sx - 66} ${sy - 110} ${sx - 70} ${sy - 140} C${sx - 40} ${sy - 120} ${sx - 20} ${sy - 110} ${sx - 6} ${sy - 96} L${sx} ${sy - 150} L${sx + 6} ${sy - 96} C${sx + 20} ${sy - 110} ${sx + 40} ${sy - 120} ${sx + 70} ${sy - 140} C${sx + 66} ${sy - 110} ${sx + 40} ${sy - 80} ${sx + 10} ${sy - 60} L${sx + 8} ${sy}Z`, 1));
  out.push(`<path d="${v.smooth([[-20, H * .93], [W * .3, H * .9], [W * .6, H * .95], [W + 20, H * .91]])} L${W + 20} ${H + 10} L-20 ${H + 10}Z" fill="${v.depth('#f6fafd', .95)}"/>`);
  for(let i = 0; i < 8; i++) out.push(`<path d="M${(W * (i + .5) / 8).toFixed(0)} ${(H * (.62 + (i % 3) * .1)).toFixed(0)} m-4 0 l4 -1 l4 1 l-4 1Z" fill="#ffffff" opacity="${(.5 + .4 * L).toFixed(2)}" class="rm-twinkle"/>`);
  out.push(v.birds(H * .2, 4, 3.5, .5));
  return v.done();
};

/* タスメニオ：エメラルドの海、海上の塔と空中回廊、テレポート集合塔、飛行艇 */
TD_VIEWS.tasumenio = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'tasumenio'), { r, N, out } = v;
  const sea = H * .6;
  out.push(v.cloud(W * .25, H * .18, 30, .8), v.cloud(W * .75, H * .1, 22, .6));
  [[W * .12, 60], [W * .9, 80]].forEach(([x, w]) => out.push(`<path d="M${x - w} ${sea} Q${x} ${sea - 18} ${x + w} ${sea}Z" fill="${v.depth('#5f8a7a', .12)}"/>`));
  for(let x = -10; x < W + 10;){ const w = 12 + r() * 14, h = 40 + r() * 110; if(Math.abs(x - W * .64) > 30) out.push(v.building(x, sea + 2, w, h, '#dfe8ec', .25, { rx: 4, win: .3 })); x += w + 10 + r() * 20; }
  out.push(v.mist(sea - 60, 70, .55));
  // テレポート集合塔
  const tx = W * .64;
  out.push(`<rect x="${tx - 13}" y="${sea - 230}" width="26" height="232" rx="6" fill="${v.grad(v.depth('#f4f8fa', .45), v.depth('#bccad2', .45), true)}"/>`);
  for(let i = 0; i < 4; i++) out.push(`<ellipse cx="${tx}" cy="${sea - 220 + i * 20}" rx="${24 - i * 3}" ry="4" fill="none" stroke="#7fe8ff" stroke-width="1.5" opacity="${(.4 + .5 * N).toFixed(2)}"/>`);
  out.push(v.glow(tx, sea - 230, 30, 40, '#7fe8ff', (.2 + .5 * N).toFixed(2)));
  // 海
  out.push(`<rect x="-10" y="${sea}" width="${W + 20}" height="${H - sea + 10}" fill="url(#rm-sea)"/>`);
  out.push(`<rect x="${tx - 12}" y="${sea + 2}" width="24" height="${(H - sea) * .6}" fill="${tdMix('#e4ecef', '#7fe8ff', N)}" opacity="${(.14 + .2 * N).toFixed(2)}" filter="url(#rm-blur3)"/>`);
  for(let i = 0; i < 8; i++){ const y = sea + 8 + i * (H - sea) / 9; out.push(`<rect x="${(W * ((i * .37) % 1)).toFixed(0)}" y="${y.toFixed(0)}" width="${(30 + i * 8).toFixed(0)}" height="1.4" fill="#e8fffb" opacity="${(.2 + .3 * L).toFixed(2)}"/>`); }
  if(N > .3) out.push(v.glow(W * .4, H * .82, W * .4, 30, '#7fffe0', (N * .25).toFixed(2)));
  out.push(v.mist(sea - 10, 24, .5));
  // 空中回廊
  const by = sea - 16, bc = v.depth('#9aa8b0', .6);
  out.push(`<rect x="-10" y="${by}" width="${W + 20}" height="5" fill="${bc}"/>`);
  for(let x = 30; x < W; x += 90) out.push(`<rect x="${x - 3}" y="${by + 5}" width="6" height="${sea - by + 20}" fill="${bc}"/><path d="M${x - 45} ${by + 5} Q${x} ${by + 26} ${x + 45} ${by + 5}" stroke="${bc}" stroke-width="2" fill="none"/>`);
  if(N > .1) for(let x = 6; x < W; x += 16) out.push(`<circle cx="${x}" cy="${by + 2}" r="1.2" fill="#fff1c9" opacity="${N.toFixed(2)}"/>`);
  // 飛行艇
  [[W * .2, H * .3, 1], [W * .82, H * .36, .7]].forEach(([x, y, s], i) => out.push(`<g class="rm-airship" style="animation-delay:-${i * 9}s"><ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${6.5 * s}" fill="${v.depth('#eef2f4', .4)}"/><path d="M${x + 18 * s} ${y} l${12 * s} -${6 * s} l0 ${9 * s}Z" fill="${v.depth('#c8d2d8', .4)}"/><rect x="${x - 9 * s}" y="${y + 4.5 * s}" width="${14 * s}" height="${3 * s}" fill="${v.depth('#9aa6ae', .4)}"/></g>`));
  // 手前の高床の家
  out.push(`<rect x="${W - 190}" y="${H * .78}" width="200" height="8" fill="${v.depth('#c8b898', .95)}"/>`);
  for(let x = W - 180; x < W; x += 36) out.push(`<rect x="${x}" y="${H * .8}" width="5" height="${H * .22}" fill="${v.depth('#7d8a90', .95)}"/>`);
  out.push(v.building(W - 150, H * .78, 80, 44, '#ece4d2', .95, { roof: 'gable', roofColor: '#2f5f78', win: .5 }));
  out.push(v.birds(H * .4, 4, 4, .7), v.birds(H * .22, 3, 3, .5));
  [[sea + 26, 1, 90], [sea + 60, -1, 70], [sea + 110, 1, 55]].forEach(([y, d, dur], i) => out.push(`<g class="${d > 0 ? 'rm-fly' : 'rm-fly-rev'}" style="animation-duration:${dur}s;animation-delay:-${i * 23}s"><g transform="translate(0 ${y}) scale(${d * (.6 + i * .3)} ${.6 + i * .3})"><path d="M-20 0 L20 0 L14 7 L-16 7Z" fill="${v.depth('#f4f6f8', .7 + i * .1)}"/><rect x="-6" y="-7" width="12" height="7" fill="${v.depth('#2f5f78', .7 + i * .1)}"/><path d="M-40 6 L-20 4" stroke="#ffffff" stroke-width="1.2" opacity=".5"/></g></g>`));
  return v.done();
};

/* フーモラ・スカイピル：成層圏の空中都市。足元の雲海、頭上の黄色い円環、中央の層状都市フレモア */
TD_VIEWS['fumora-skypill'] = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'fumora'), { r, N, out } = v;
  const gold = tdMix(v.depth('#e8c21a', .8), '#ffe066', N * .3), goldD = tdMix(gold, '#5a4a00', .3);
  // 遠くの円環
  out.push(`<path d="M-40 ${H * .5} Q${W / 2} ${H * .26} ${W + 40} ${H * .48}" stroke="${v.depth('#e0c21a', .2)}" stroke-width="6" fill="none"/>`);
  for(let x = -10; x < W + 10;){ const w = 10 + r() * 14, h = 120 + r() * 160; if(Math.abs(x - W * .48) > 50) out.push(v.building(x, H * .84, w, h, '#8aa4c4', .25, { spire: r() < .5 ? 24 : 0, win: .3, winColor: '#ffffff' })); x += w + 12 + r() * 14; }
  out.push(v.mist(H * .4, H * .5, .55));
  // 空路：自動航行の個人移動ポッドが行き交う（奥）
  const fly = (y, kind, d, dur, delay, t) => {
    const c = v.depth('#f4f6fa', t), acc = v.depth('#e8c21a', t), cls = d > 0 ? 'rm-fly' : 'rm-fly-rev';
    let g = `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:-${delay}s"><g transform="translate(0 ${y.toFixed(0)}) scale(${d * 1.4} 1.4)">`;
    if(kind === 'pod') g += `<rect x="-7" y="-3" width="14" height="6" rx="3" fill="${c}"/><rect x="2" y="-2" width="4" height="3" rx="1" fill="#7fd4ff"/>`;
    if(kind === 'ship') g += `<ellipse cx="0" cy="0" rx="22" ry="6" fill="${c}"/><rect x="-10" y="4" width="18" height="4" rx="2" fill="${v.depth('#c8d0dc', t)}"/><path d="M16 -2 l10 -6 l0 10Z" fill="${acc}"/>`;
    if(kind === 'bus') g += `<rect x="-30" y="-5" width="60" height="10" rx="5" fill="${c}"/><rect x="-30" y="-1" width="60" height="2" fill="${acc}"/>${[-20, -10, 0, 10, 20].map(x => `<rect x="${x - 3}" y="-4" width="5" height="3" rx="1" fill="#9fd8ff"/>`).join('')}`;
    if(N > .2) g += `<circle cx="${kind === 'bus' ? 30 : (kind === 'ship' ? 22 : 7)}" cy="0" r="1.6" fill="#ffffff" class="rm-blink"/>`;
    return g + `</g></g>`;
  };
  [H * .3, H * .38, H * .46].forEach((y, i) => out.push(`<path d="M-20 ${y} Q${W / 2} ${y - 14} ${W + 20} ${y + 4}" stroke="#ffffff" stroke-width="1" fill="none" opacity="${(.25 + .2 * N).toFixed(2)}" stroke-dasharray="30 14" class="rm-flow"/>`));
  for(let i = 0; i < 9; i++) out.push(fly(H * (.29 + (i % 3) * .08), 'pod', i % 2 ? -1 : 1, 18 + (i % 4) * 5, i * 4, .35));
  out.push(fly(H * .52, 'bus', 1, 40, 10, .45));
  // 頭上の巨大な円環
  out.push(`<path d="M-40 ${H * .16} Q${W * .35} ${-H * .06} ${W * .62} ${H * .02}" stroke="${goldD}" stroke-width="28" fill="none"/><path d="M-40 ${H * .16} Q${W * .35} ${-H * .06} ${W * .62} ${H * .02}" stroke="${gold}" stroke-width="20" fill="none"/>`);
  out.push(`<path d="M${W * .58} -10 Q${W * .86} ${H * .05} ${W + 40} ${H * .3}" stroke="${goldD}" stroke-width="24" fill="none"/><path d="M${W * .58} -10 Q${W * .86} ${H * .05} ${W + 40} ${H * .3}" stroke="${gold}" stroke-width="16" fill="none"/>`);
  // 中央の層状都市
  const cx = W * .48;
  out.push(`<rect x="${cx - 30}" y="-10" width="60" height="${H * .9}" fill="${v.grad(v.depth('#3a4a68', .7), v.depth('#1e2a44', .7), true)}"/>`);
  for(let x = cx - 24; x < cx + 26; x += 8) out.push(`<rect x="${x}" y="-10" width="2" height="${H * .9}" fill="${gold}" opacity="${(.4 + .4 * N).toFixed(2)}"/>`);
  [.26, .42, .58, .74].forEach((t, i) => {
    const y = H * t, rx = 64 + i * 10;
    out.push(`<ellipse cx="${cx}" cy="${y + 5}" rx="${rx}" ry="${9 + i}" fill="${goldD}"/><ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${8 + i}" fill="${gold}"/><ellipse cx="${cx}" cy="${y - 3}" rx="${rx - 10}" ry="${5 + i}" fill="${v.depth('#5f9a4e', .7)}"/>`);
    if(N > .2) out.push(v.glow(cx, y + 3, rx * 1.2, 10, '#fff4b0', (N * .6).toFixed(2)));
  });
  // 手前を飛ぶ飛行艇・輸送機・ポッド、鳥
  out.push(fly(H * .2, 'ship', -1, 60, 20, .8), fly(H * .64, 'ship', 1, 50, 5, .85), fly(H * .7, 'bus', -1, 34, 12, .9));
  for(let i = 0; i < 5; i++) out.push(fly(H * (.56 + (i % 3) * .06), 'pod', i % 2 ? 1 : -1, 12 + i * 3, i * 2.5, .9));
  out.push(v.birds(H * .14, 4, 4, .7));
  // 足元の雲海
  out.push(`<rect x="-60" y="${H * .84}" width="${W + 120}" height="${H * .2}" fill="${v.grad(tdMix(ph.bottom, '#ffffff', .5 * L + .1), tdMix(ph.bottom, '#ffffff', .7 * L + .15))}"/>`);
  for(let i = 0; i < 7; i++) out.push(v.cloud((W + 120) * i / 7 - 40, H * .86 + (i % 2) * 8, 24 + (i % 3) * 6, .95));
  return v.done();
};

TD_VIEWS.niporan = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'niporan'), { r, N, out } = v;
  const hzY = H * .4;
  out.push(v.cloud(W * .78, H * .14, 30, .7), v.cloud(W * .2, H * .08, 22, .55));
  out.push(v.plane(H * .12, .8, 1, 75), v.plane(H * .24, .55, -1, 95));
  out.push(v.ridge(hzY - 4, 24, 10, '#6c7a9a', .1));
  for(let x = -6; x < W + 10;){ const w = 6 + r() * 10, h = 8 + Math.pow(r(), 2) * 40; out.push(v.building(x, hzY + 4, w, h, '#5a6888', .18)); x += w + 1; }
  out.push(v.ground(hzY + 4, '#5a6888', .2));
  out.push(v.mist(hzY - 26, 46, .65));
  if(N > .2) out.push(v.glow(W * .5, hzY + 20, W * .7, 40, '#ffcf9a', (N * .45).toFixed(2)));
  // 見下ろす街：地平線から窓の下まで、手前ほど大きな建物の段を重ねる
  const rows = v.cityRows(hzY + 10, H + 30, 8, ['#4a5878', '#55627e', '#3f4c68'], .3, 1, { w: 13, h: 34, gap: 2, win: .3 });
  out.push(...rows.slice(0, 3));
  // 細い格子の塔（3段目の街から立つ）
  const tx = W * .33, base = rows.baseAt(3), top = H * .03;
  const tw = y => 2 + (y - top) / (base - top) * 20;
  const body = v.depth('#e8e4f0', .6), pink = '#ff8fd8';
  out.push(v.glow(tx, H * .3, 40, H * .32, pink, (N * .35).toFixed(2)));
  out.push(`<path d="M${tx - tw(base)} ${base} L${tx - 1.2} ${top} L${tx + 1.2} ${top} L${tx + tw(base)} ${base}Z" fill="${tdMix(body, pink, N * .55)}"/>`);
  for(let y = base - 8; y > top + 30; y -= 10) out.push(`<line x1="${(tx - tw(y)).toFixed(1)}" y1="${y}" x2="${(tx + tw(y)).toFixed(1)}" y2="${y}" stroke="${tdMix(v.depth('#b8b2c8', .6), '#ffd6f2', N)}" stroke-width=".8"/>`);
  [[base - (base - top) * .55, 9, 8], [base - (base - top) * .7, 6, 6]].forEach(([y, w, h]) => out.push(`<rect x="${tx - w}" y="${y}" width="${w * 2}" height="${h}" rx="2" fill="${tdMix(v.depth('#f0ecf6', .6), '#d2b4ff', N * .7)}"/>`));
  out.push(`<circle cx="${tx}" cy="${top}" r="2" fill="${pink}" class="rm-twinkle"/>`);
  out.push(...rows.slice(3, 4));
  // 光るドーム（4段目の街の中）
  const dx = W * .7, dy = rows.baseAt(4);
  out.push(v.glow(dx, dy - 14, 80, 30, '#7fe8ff', (N * .45).toFixed(2)));
  out.push(`<path d="M${dx - 58} ${dy} A58 32 0 0 1 ${dx + 58} ${dy}Z" fill="${v.grad(tdMix(v.depth('#a8c0e0', .7), '#9fe8ff', N * .6), v.depth('#5a7aa0', .7))}"/>`);
  for(let i = 1; i < 4; i++) out.push(`<path d="M${dx - 58 + i * 3} ${dy - i * 7} A${58 - i * 7} ${32 - i * 7} 0 0 1 ${dx + 58 - i * 3} ${dy - i * 7}" stroke="#e6f6ff" stroke-width="1" fill="none" opacity="${(.25 + .4 * N).toFixed(2)}"/>`);
  out.push(...rows.slice(4, 5));
  out.push(v.road(rows.baseAt(4) + 2, 8, .7, 7));
  out.push(...rows.slice(5));
  out.push(v.birds(H * .22, 5, 3.5, .6));
  return v.done();
};


TD_VIEWS.hubert = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'hubert'), { r, N, out } = v;
  out.push(v.cloud(W * .18, H * .18, 36, .9), v.cloud(W * .82, H * .12, 30, .85), v.cloud(W * .55, H * .06, 20, .6));
  out.push(v.plane(H * .1, .7, -1, 85));
  for(let x = -10; x < W + 10;){ const w = 14 + r() * 14, h = 80 + r() * 140; out.push(v.building(x, H * .52, w, h, '#eef3f8', .15, { rx: w / 2.5 })); x += w + 6; }
  out.push(v.ground(H * .52, '#eef3f8', .15));
  out.push(v.mist(H * .36, H * .3, .55));
  const rows = v.cityRows(H * .54, H + 30, 6, ['#eef3f8', '#e4ebf2', '#f6f9fc'], .3, 1, { w: 18, h: 64, gap: 6, rx: 7, win: .25, winColor: '#bfe8ff' });
  out.push(...rows.slice(0, 2));
  // 中央の研究塔と光の紋章
  const cx = W * .52;
  out.push(`<path d="M${cx - 34} ${H} L${cx - 22} ${H * .12} Q${cx} ${H * .01} ${cx + 22} ${H * .12} L${cx + 34} ${H}Z" fill="${v.grad(v.depth('#ffffff', .7), v.depth('#c9d6e2', .7), true)}"/>`);
  for(let i = 0; i < 4; i++) out.push(`<rect x="${cx - 14 + i * 9}" y="${H * .18}" width="2" height="${H * .82}" fill="#4fb8ff" opacity="${(.3 + .5 * N).toFixed(2)}"/>`);
  out.push(v.glow(cx, H * .33, 50, 50, '#7fd4ff', (.2 + .4 * N).toFixed(2)));
  out.push(`<circle cx="${cx}" cy="${H * .33}" r="15" fill="#e8f8ff" stroke="#6fc8ff" stroke-width="3"/><path d="M${cx - 5} ${H * .33 + 6} C${cx - 7} ${H * .33 - 2} ${cx - 2} ${H * .33 - 9} ${cx + 5} ${H * .33 - 10} C${cx + 4} ${H * .33 - 3} ${cx + 1} ${H * .33 + 3} ${cx - 5} ${H * .33 + 6}Z" fill="#8ab8dc"/>`);
  out.push(...rows.slice(2, 4));
  out.push(v.road(rows.baseAt(3) + 2, 8, .75, 6));
  out.push(...rows.slice(4));
  out.push(v.birds(H * .2, 4, 3.5, .6));
  out.push(`<path d="M-10 ${H * .86} Q${W / 2} ${H * .78} ${W + 10} ${H * .88}" stroke="${v.depth('#ffffff', .95)}" stroke-width="7" fill="none"/><path d="M-10 ${H * .86} Q${W / 2} ${H * .78} ${W + 10} ${H * .88}" stroke="#4fb8ff" stroke-width="1.4" fill="none" opacity="${(.4 + .4 * N).toFixed(2)}" stroke-dasharray="18 12" class="rm-flow"/>`);
  return v.done();
};

TD_VIEWS.yuretsuea = (W, H, L, ph, wx, now) => {
  const v = tdLS(W, H, L, ph, 'yuretsuea'), { r, N, out } = v;
  out.push(v.cloud(W * .8, H * .16, 26, .7));
  out.push(v.plane(H * .08, .7, 1, 90));
  out.push(v.ridge(H * .46, 60, 8, '#7d8aa0', .12, { snow: true, peak: true }));
  out.push(v.mist(H * .38, 60, .7));
  const rows = v.cityRows(H * .48, H + 34, 7, ['#c8bca6', '#d4c8b0', '#bfb29a'], .3, 1, { w: 20, h: 24, gap: 2, win: .35, roof: rr => rr() < .78 ? 'gable' : 'dome', roofColors: ['#6a4a3a', '#5a6a78', '#7a5a42'] });
  out.push(...rows.slice(0, 3));
  // ツェンタル・ネヘタ
  const tx = W * .44, tw = 44, top = H * .14;
  out.push(`<rect x="${tx - tw / 2}" y="${top}" width="${tw}" height="${H - top}" fill="${v.grad(v.depth('#d8ccb6', .7), v.depth('#a8987c', .7), true)}"/>`);
  out.push(`<rect x="${tx - tw / 2 - 5}" y="${top - 6}" width="${tw + 10}" height="9" fill="${v.depth('#b08a4a', .7)}"/>`);
  out.push(`<path d="M${tx - tw / 2 - 3} ${top - 6} L${tx} ${top - 66} L${tx + tw / 2 + 3} ${top - 6}Z" fill="${v.grad(v.depth('#6a7a88', .7), v.depth('#3a4a58', .7), true)}"/><rect x="${tx - 1}" y="${top - 88}" width="2" height="24" fill="${v.depth('#b08a4a', .7)}"/>`);
  for(let y = top + 76; y < H; y += 28) out.push(`<rect x="${tx - 6}" y="${y}" width="12" height="15" rx="6" fill="${tdMix(v.depth('#4a4030', .7), '#ffe2a8', N * .8)}"/>`);
  const cy = top + 34, cr = 18;
  const hr = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2, mn = now.getMinutes() / 60 * Math.PI * 2;
  out.push(v.glow(tx, cy, 40, 40, '#fff1c9', (N * .6).toFixed(2)));
  out.push(`<circle cx="${tx}" cy="${cy}" r="${cr}" fill="${tdMix('#f6efe0', '#fff6dc', N)}" stroke="${v.depth('#b08a4a', .8)}" stroke-width="3"/>`);
  for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; out.push(`<line x1="${(tx + Math.sin(a) * cr * .76).toFixed(1)}" y1="${(cy - Math.cos(a) * cr * .76).toFixed(1)}" x2="${(tx + Math.sin(a) * cr * .9).toFixed(1)}" y2="${(cy - Math.cos(a) * cr * .9).toFixed(1)}" stroke="#3a3020" stroke-width="1.1"/>`); }
  out.push(`<line x1="${tx}" y1="${cy}" x2="${(tx + Math.sin(hr) * cr * .5).toFixed(1)}" y2="${(cy - Math.cos(hr) * cr * .5).toFixed(1)}" stroke="#2a2418" stroke-width="2.2" stroke-linecap="round"/><line x1="${tx}" y1="${cy}" x2="${(tx + Math.sin(mn) * cr * .78).toFixed(1)}" y2="${(cy - Math.cos(mn) * cr * .78).toFixed(1)}" stroke="#2a2418" stroke-width="1.4" stroke-linecap="round"/>`);
  out.push(...rows.slice(3, 5));
  out.push(v.road(rows.baseAt(4) + 2, 8, .75, 5));
  out.push(...rows.slice(5));
  out.push(v.birds(H * .26, 6, 3.5, .6));
  return v.done();
};

TD_VIEWS.sanrudo = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'sanrudo'), { r, N, out } = v;
  const _sky = [v.plane(H * .14, .9, 1, 80)];
  const hzY = H * .5;
  out.push(..._sky);
  // 奥：左に黄金区域、右に白金区域
  out.push(v.glow(W * .2, hzY - 40, W * .32, 110, '#ffc94a', (.15 + N * .4).toFixed(2)));
  for(let x = -10; x < W * .44;){ const w = 12 + r() * 12, h = 70 + r() * 140; out.push(v.building(x, hzY, w, h, '#b8902a', .25, { spire: r() < .4 ? 16 : 0, win: .45, winColor: '#ffd36a' })); x += w + 3; }
  if(N > .25) [W * .1, W * .3].forEach((x, i) => out.push(`<path d="M${x} ${hzY - 60} L${x - 34} -40 L${x + 6} -40Z" fill="#ffe08a" opacity="${(N * .16).toFixed(2)}" class="rm-sweep" style="transform-origin:${x}px ${hzY - 60}px;animation-delay:-${i * 3}s"/>`));
  out.push(v.glow(W * .82, hzY - 60, W * .3, 120, '#eef4ff', (.1 + N * .35).toFixed(2)));
  for(let x = W * .58; x < W + 10;){ const w = 14 + r() * 10, h = 100 + r() * 140; out.push(v.building(x, hzY, w, h, '#eef2f6', .25, { rx: 2, win: .5, winColor: '#ffffff' })); x += w + 5; }
  out.push(v.ground(hzY, '#9a8a70', .28));
  out.push(v.mist(hzY - 70, 100, .5));
  // ラルウォットの石造の街（中央は大通り）
  const rows = v.cityRows(hzY + 8, H + 34, 7, ['#d6c8a8', '#cbb894', '#e0d4b8'], .2, 1, { w: 22, h: 26, gap: 3, win: .35, winColor: '#ffe2a8', roof: rr => rr() < .25 ? 'dome' : null, roofColors: ['#b8a070', '#c9a24a'] });
  out.push(...rows.slice(0, 3));
  // 中央均衡銀行
  const bx = W * .62, by = rows.baseAt(3), sc = .82;
  const stone = v.depth('#e6dac0', .7), stoneD = v.depth('#b8a888', .7);
  out.push(`<g transform="translate(${bx} ${by}) scale(${sc})">`);
  out.push(`<rect x="-130" y="-90" width="260" height="92" fill="${v.grad(stone, stoneD)}"/><path d="M-140 -90 L0 -124 L140 -90Z" fill="${v.depth('#d8cab0', .7)}"/>`);
  for(let i = 0; i < 10; i++) out.push(`<rect x="${-118 + i * 26}" y="-84" width="10" height="84" fill="${stoneD}"/>`);
  out.push(`<path d="M-56 -120 A56 46 0 0 1 56 -120Z" fill="${v.grad(tdMix(v.depth('#e0b23a', .7), '#ffd36a', N * .4), v.depth('#a07a20', .7))}"/>`);
  const ink = v.depth('#1e1e22', .8);
  out.push(`<rect x="-1.5" y="-190" width="3" height="24" fill="${ink}"/><line x1="-24" y1="-186" x2="24" y2="-186" stroke="${ink}" stroke-width="2.5"/><path d="M-32 -174 q8 6 16 0 M16 -174 q8 6 16 0" stroke="${ink}" stroke-width="2" fill="none"/>`);
  out.push(`</g>`);
  if(N > .2) out.push(v.glow(bx, by - 40, 150, 60, '#fff1c9', (N * .45).toFixed(2)));
  out.push(...rows.slice(3, 5));
  out.push(v.road(rows.baseAt(4) + 2, 9, .75, 6));
  out.push(...rows.slice(5));
  out.push(v.birds(H * .3, 6, 4, .7));
  return v.done();
};

TD_VIEWS.wonhead = (W, H, L, ph, wx) => {
  const v = tdLS(W, H, L, ph, 'wonhead'), { r, N, out } = v;
  out.push(v.cloud(W * .2, H * .14, 26, .7));
  out.push(v.plane(H * .1, .7, -1, 80));
  out.push(v.ridge(H * .42, 60, 8, '#7b8fa6', .12, { snow: true, peak: true }));
  out.push(`<rect x="-20" y="${H * .42}" width="${W + 40}" height="14" fill="${v.depth('#7aa6c8', .2)}"/>`);
  out.push(v.mist(H * .36, 56, .65));
  const warm = '#ffcf8a';
  if(N > .2) out.push(v.glow(W * .5, H * .6, W * .6, 60, warm, (N * .5).toFixed(2)));
  const rows = v.cityRows(H * .47, H + 34, 7, ['#b88a64', '#c49a72', '#a87a56'], .3, 1, { w: 24, h: 20, gap: 2, win: .4, winColor: warm, roof: () => 'gable', roofColors: ['#a43a2a', '#8a3a2a', '#b2483a'] });
  out.push(...rows.slice(0, 3));
  // 百層屋台街
  const tx = W * .68, th = H * .84, n = 12;
  for(let i = 0; i < n; i++){
    const y = H - (i + 1) * th / n, w = 84 - i * 3.6, c = v.depth(i % 2 ? '#8a5a3a' : '#9a6a44', .75);
    out.push(`<rect x="${tx - w / 2}" y="${y}" width="${w}" height="${th / n - 3}" fill="${c}"/><rect x="${tx - w / 2 - 4}" y="${y}" width="${w + 8}" height="3.5" fill="${v.depth('#b2483a', .75)}"/>`);
    if(N > .15) out.push(`<rect x="${tx - w / 2 + 4}" y="${y + 7}" width="${w - 8}" height="5" fill="${warm}" opacity="${(N * .85).toFixed(2)}"/>`);
  }
  if(N > .2) out.push(v.glow(tx, H * .5, 70, H * .5, warm, (N * .4).toFixed(2)));
  out.push(...rows.slice(3, 5));
  out.push(v.road(rows.baseAt(4) + 2, 9, .75, 7));
  for(let i = 0; i < 5; i++) out.push(`<ellipse class="rm-smoke" style="animation-delay:-${i * 1.6}s" cx="${(W * (.1 + i * .2)).toFixed(0)}" cy="${(rows.baseAt(4) - 20).toFixed(0)}" rx="14" ry="10" fill="#ffffff" opacity=".4"/>`);
  out.push(...rows.slice(5));
  [H * .8, H * .92].forEach((y, j) => {
    out.push(`<path d="M-10 ${y} Q${W / 2} ${y + 16} ${W + 10} ${y}" stroke="${v.depth('#3a2a20', .95)}" stroke-width="1" fill="none"/>`);
    for(let x = 14 + j * 11; x < W; x += 26){ const yy = y + Math.sin(Math.PI * x / W) * 8 + 4; out.push(`<circle cx="${x}" cy="${yy.toFixed(1)}" r="3.4" fill="${N > .15 ? warm : v.depth('#e8a060', .95)}" opacity="${(.6 + .4 * N).toFixed(2)}"/>`); }
  });
  out.push(v.birds(H * .24, 5, 3.5, .6));
  return v.done();
};

// 自分で空（月）を描く景色
const TD_OWN_SKY = { larliafrus:true };

/* --------------------------------------------------------------------------
   9. 部屋の内装（国ごと）
      未来世界の人はほとんど本を読まないので、本棚は置かない。
      部屋の右側は、その国の暮らしがいちばん出る家具の場所（feature）にしている。
        wall    壁の仕上げと色（plain / wood / ice / metal / panel / stone / washi / wainscot / stained）
        floor   床（wood / tatami / ice / metal / stone / marble / carpet / deck）
        frame   窓枠の色   window 窓の形（plain / shoji / arch / heavy / panel / round / wide）
        curtain カーテン（true / false / 'torn'）
        lamp    明かり（anazanium / hikaritake / ceiling / bulb / pink / andon / brass）
        clock   時計（wall / digital / none）
        calendar カレンダー（paper / digital / pinned / torn）
        terminal 机の端末（screen / offline / noise）
        desk    机（desk / workbench / table）
        feature 部屋の右側（tdFeature を参照）
        props   小物（tdWallProps / tdDeskProps / tdFloorProps を参照）
        glow    夜、窓から部屋に入る光の色
      新しい国は、近い国の行をコピーして書き換える。書かなかった国は DEFAULT になる。
   -------------------------------------------------------------------------- */

const ROOM_STYLE_DEFAULT = {
  wall:['plain', '#e9edf2'], floor:['wood', '#b9a68a'], frame:'#f7f8fa', window:'plain', curtain:true,
  lamp:'anazanium', clock:'wall', calendar:'paper', terminal:'screen', desk:'desk', feature:'plants', props:['plant'], glow:'#bfd8ff'
};

const ROOM_STYLE = {
  // 東京の高層階。障子、畳、床の間に龍の掛け軸（龍教）。夜は街の光が差し込む
  niporan:            { wall:['washi', '#ece6d8'], floor:['tatami', '#c8c08c'], frame:'#6e5238', window:'shoji', curtain:false,
                        lamp:'andon', feature:'tokonoma', props:['tea'], glow:'#ff9fe0' },
  // 閉鎖型施設の中の研究都市。管理された照明、サーバー、データ表示
  sertcity:           { wall:['panel', '#e6ebf1'], floor:['metal', '#ccd3dc'], frame:'#a4afbd', window:'panel', curtain:false,
                        lamp:'ceiling', clock:'digital', calendar:'digital', feature:'server', props:['datapanel'], glow:'#7fe8ff' },
  // 白い研究都市の住宅。猫と暮らす設計（羽根と猫）
  hubert:             { wall:['panelwhite', '#f1f4f6'], floor:['wood', '#e2d8c6'], frame:'#ffffff', window:'rounded', curtain:false,
                        desk:'round', feature:'hubertHome', props:['catwalk', 'cat', 'catdesk'], glow:'#7fd4ff' },
  // リフランの木の家。外に月脈樹。夜は明かりを抑え、ヒカリタケと月脈樹の光で過ごす
  larliafrus:         { wall:['wood', '#b8986a'], floor:['wood', '#86663f'], frame:'#6a4e2f', window:'arch', curtain:false,
                        lamp:'hikaritake', feature:'greenery', props:['vines'], glow:'#e6efff' },
  // 物に名前を付け、手入れして長く使う工匠の部屋
  yuretsuea:          { wall:['plasterwood', '#e6dcc8'], floor:['wood', '#94714a'], frame:'#5a4632', curtain:true,
                        lamp:'brass', desk:'workbench', feature:'workshop', props:['repair', 'smallclocks'], glow:'#ffd9a0' },
  // 極寒の首都。生活感がなく、肉が干されているだけ。外は煤煙と赤い光、ネットは使えない
  garhyura:           { wall:['metal', '#6f757e'], floor:['metal', '#575c63'], frame:'#34383e', window:'heavy', curtain:false,
                        lamp:'bulb', calendar:'pinned', terminal:'offline', desk:'bench', feature:'meatrack', props:['pipes', 'frost'], glow:'#ff2a2a' },
  // マルネアのホテルの一室。管理者はいないがロボットが動いている。煙が漂い、物が散らかり、時計はない
  maimok:             { wall:['stained', '#d9c3cf'], floor:['carpet', '#a88498'], frame:'#8a7480', curtain:'torn',
                        lamp:'pink', clock:'none', calendar:'torn', terminal:'noise', feature:'hotelbed', props:['clutter', 'robot', 'smoke'], glow:'#ff3fb0' },
  // 芸術が暮らしの延長にあるアトリエ。描きかけのキャンバス（未完の創造）
  orgaron:            { wall:['plain', '#f3ede4'], floor:['wood', '#b88d5f'], frame:'#ece4d7', window:'arch', curtain:true,
                        feature:'atelier', props:['ink', 'easel', 'violin', 'brushes'], glow:'#ffb0d8' },
  // 復元住宅。砂岩の壁、歯車（シンボル）、古い地図、発掘品の陳列棚
  kyuma:              { wall:['stone', '#dcc6a0'], floor:['stone', '#b7976e'], frame:'#7a5a3a', window:'arch', curtain:true,
                        lamp:'brass', feature:'kyumaHome', props:['gear', 'map', 'lens', 'digtools', 'costume'], glow:'#ffd9a0' },
  // 黄金と白金、天秤。役割を示す仮面
  sanrudo:            { wall:['twotone', '#efe2c0'], floor:['checker', '#e8e2d4'], frame:'#c6a24a', curtain:'velvet',
                        lamp:'brass', feature:'salon', props:['scale', 'chips', 'cards'], glow:'#ffd36a' },
  // 生物と暮らす家。水槽やテラリウムの共生体、観察記録
  belnea:             { wall:['plain', '#e2ede8'], floor:['wood', '#c3cfc5'], frame:'#d2e0da', curtain:false,
                        feature:'terrarium', props:['notes'] },
  // 鍋を囲む台所と食卓。発酵の瓶、吊るした食材（火は使わない）
  wonhead:            { wall:['tile', '#f2e2c6'], floor:['wood', '#a4774b'], frame:'#7a5434', curtain:true,
                        lamp:'pendant', desk:'table', feature:'dining', props:['pot', 'bowls', 'chairs'], glow:'#ffc070' },
  // 氷のブロックの家。家族の一員の大きな犬、地下の氷保管庫
  'chiriludo-ailtsua':{ wall:['ice', '#e3eff7'], floor:['ice', '#d3e3ee'], frame:'#cddfeb', curtain:false,
                        feature:'chiriHome', props:['dog', 'hatch'], glow:'#bfe0ff' },
  // ルハータの高床の家。丸窓、透明な送水パイプ、船の模型と貝
  tasumenio:          { wall:['wainscot', '#e8f1f3'], floor:['deck', '#b39772'], frame:'#2f5f78', window:'round', curtain:false,
                        feature:'waterpipe', props:['ship'], glow:'#7fffe0' },
  // 回転する空中都市の部屋。大きな窓、多文化が混ざった家具
  'fumora-skypill':   { wall:['plain', '#edf2fa'], floor:['marble', '#d4dce9'], frame:'#ffffff', window:'wide', curtain:false,
                        feature:'lounge', props:['gauge', 'skydrink'], glow:'#fff4b0' }
};

function tdRoomStyle(id){ return Object.assign({}, ROOM_STYLE_DEFAULT, ROOM_STYLE[id] || {}); }

// インクの飛び散り（しずく・垂れを含む）
function tdInk(r, x, y, size, color, op){
  let d = '';
  const n = 14;
  for(let i = 0; i <= n; i++){
    const a = i / n * Math.PI * 2, rr = size * (.55 + r() * .6) * (i % 3 === 0 ? 1.35 : 1);
    d += (i ? ' L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr * .85).toFixed(1);
  }
  let o = `<path d="${d}Z" fill="${color}" opacity="${op}"/>`;
  for(let i = 0; i < 10; i++){
    const a = r() * Math.PI * 2, dist = size * (1.2 + r() * 1.8);
    o += `<circle cx="${(x + Math.cos(a) * dist).toFixed(1)}" cy="${(y + Math.sin(a) * dist).toFixed(1)}" r="${(size * (.06 + r() * .14)).toFixed(1)}" fill="${color}" opacity="${op}"/>`;
  }
  for(let i = 0; i < 3; i++){
    const dx = (r() - .5) * size, len = size * (.8 + r() * 2.4), w = size * (.08 + r() * .1);
    o += `<rect x="${(x + dx - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${len.toFixed(1)}" rx="${(w / 2).toFixed(1)}" fill="${color}" opacity="${op}"/><circle cx="${(x + dx).toFixed(1)}" cy="${(y + len).toFixed(1)}" r="${(w * .8).toFixed(1)}" fill="${color}" opacity="${op}"/>`;
  }
  return o;
}
const TD_INKS = ['#1a2a6a', '#141414', '#b0203a', '#e3a02e', '#2e8a8a', '#7a2ab0'];

function tdRoomSvg(nation, now, wx, ph, info){
  const id = nation.id;
  const st = tdRoomStyle(id);
  const L = ph.light, N = 1 - L;
  const accent = nation.accentColor || '#1F6BFF';

  // 明かり
  let lampOn = L < .62;
  if(st.lamp === 'hikaritake') lampOn = false;
  if(st.lamp === 'ceiling') lampOn = true;
  if(st.lamp === 'bulb') lampOn = true;
  const roomL = st.lamp === 'ceiling' ? Math.max(L, .55) : (id === 'garhyura' ? Math.min(L, .55) : L);
  const NIGHT = '#0f1524';
  const boost = lampOn && st.lamp !== 'ceiling' ? .12 : 0;
  const lit = (c, k) => tdMix(NIGHT, c, .14 + .86 * Math.min(1, roomL * (k == null ? 1 : k) + boost));
  const dark = (c, t) => tdMix(c, '#000000', t);

  const wall = lit(st.wall[1]);
  const floor = lit(st.floor[1]);
  const frame = lit(st.frame);
  const deskBase = { metal:'#5d636b', ice:'#b9cfdd' }[st.floor[0]] || '#a8957a';
  const wood = lit(st.desk === 'table' ? '#9a6b42' : (id === 'sertcity' ? '#c9d1db' : (id === 'garhyura' ? '#5f646b' : deskBase)));
  const woodDark = dark(wood, .25);

  const wide = st.window === 'wide';
  const G = { WX: wide ? 70 : 96, WY: 54, WW: wide ? 640 : 584, WH: 372 };
  const { WX, WY, WW, WH } = G;
  const out = [];

  /* ---------- 壁 ---------- */
  out.push(`<rect width="1200" height="525" fill="${wall}"/>`);
  switch(st.wall[0]){
    case 'wood':
      for(let x = 0; x < 1200; x += 38) out.push(`<rect x="${x}" y="0" width="1.5" height="525" fill="${dark(wall, .18)}" opacity=".6"/>`);
      break;
    case 'ice':
      for(let y = 0, r = 0; y < 525; y += 52, r++){
        out.push(`<rect x="0" y="${y}" width="1200" height="1.5" fill="#ffffff" opacity="${.35 + .3 * roomL}"/>`);
        for(let x = (r % 2) * 60; x < 1200; x += 120) out.push(`<rect x="${x}" y="${y}" width="1.5" height="52" fill="#ffffff" opacity="${.35 + .3 * roomL}"/>`);
      }
      break;
    case 'metal':
      for(let x = 0; x < 1200; x += 150){
        out.push(`<rect x="${x}" y="0" width="2" height="525" fill="${dark(wall, .3)}"/>`);
        for(let y = 20; y < 525; y += 60) out.push(`<circle cx="${x + 10}" cy="${y}" r="2.2" fill="${dark(wall, .35)}"/><circle cx="${x + 140}" cy="${y}" r="2.2" fill="${dark(wall, .35)}"/>`);
      }
      out.push(`<rect x="0" y="0" width="1200" height="525" fill="url(#rm-rust)" opacity=".3"/>`);
      break;
    case 'panel':
      for(let x = 0; x < 1200; x += 100) out.push(`<rect x="${x}" y="0" width="1" height="525" fill="${dark(wall, .1)}"/>`);
      out.push(`<rect x="0" y="262" width="1200" height="1" fill="${dark(wall, .1)}"/>`);
      break;
    case 'stone':
      for(let y = 0, r = 0; y < 525; y += 36, r++){
        out.push(`<rect x="0" y="${y}" width="1200" height="1.5" fill="${dark(wall, .14)}"/>`);
        for(let x = (r % 2) * 45; x < 1200; x += 90) out.push(`<rect x="${x}" y="${y}" width="1.5" height="36" fill="${dark(wall, .14)}"/>`);
      }
      break;
    case 'washi':
      out.push(`<rect x="0" y="330" width="1200" height="190" fill="${dark(wall, .06)}"/><rect x="0" y="328" width="1200" height="4" fill="${lit('#6e5238')}"/>`);
      break;
    case 'wainscot':
      out.push(`<rect x="0" y="360" width="1200" height="160" fill="${lit('#c9b08a')}"/>`);
      for(let x = 0; x < 1200; x += 30) out.push(`<rect x="${x}" y="360" width="1.2" height="160" fill="${dark(lit('#c9b08a'), .2)}"/>`);
      out.push(`<rect x="0" y="356" width="1200" height="6" fill="${lit('#2f5f78')}"/>`);
      break;
    case 'stained': {
      // 色あせた壁紙と染み
      for(let x = 0; x < 1200; x += 46) out.push(`<rect x="${x}" y="0" width="22" height="525" fill="${dark(wall, .05)}"/>`);
      const r = tdRand('stain');
      for(let i = 0; i < 7; i++) out.push(`<ellipse cx="${(r() * 1200).toFixed(0)}" cy="${(r() * 500).toFixed(0)}" rx="${(20 + r() * 50).toFixed(0)}" ry="${(14 + r() * 30).toFixed(0)}" fill="${dark(wall, .12)}" opacity=".5"/>`);
      out.push(`<path d="M0 300 L1200 300" stroke="${dark(wall, .15)}" stroke-width="2"/>`);
      break;
    }
    case 'twotone': {
      // 黄金と白金。境目に、どちらにも偏らない調律の黒い線
      const g = lit('#efe2c0'), pl = lit('#e9edf1');
      out.push(`<rect x="0" y="0" width="600" height="525" fill="${g}"/><rect x="600" y="0" width="600" height="525" fill="${pl}"/>`);
      for(let y = 20; y < 520; y += 60) for(let x = 20; x < 1200; x += 60){
        const c = x < 600 ? dark(g, .1) : dark(pl, .08);
        out.push(`<path d="M${x} ${y - 12} Q${x + 8} ${y} ${x} ${y + 12} Q${x - 8} ${y} ${x} ${y - 12}Z" fill="${c}" opacity=".6"/><circle cx="${x + 30}" cy="${y + 30}" r="2" fill="${c}"/>`);
      }
      out.push(`<rect x="597" y="0" width="6" height="525" fill="${lit('#1e1e22')}"/>`);
      out.push(`<rect x="0" y="360" width="1200" height="160" fill="${lit('#1e1e22')}" opacity=".9"/><rect x="0" y="356" width="1200" height="5" fill="${lit('#c9a24a')}"/>`);
      for(let x = 20; x < 1200; x += 80) out.push(`<rect x="${x}" y="376" width="60" height="128" fill="none" stroke="${lit('#c9a24a')}" stroke-width="1.2" opacity=".6"/>`);
      break;
    }
    case 'panelwhite':
      // 角を丸めた白いパネル
      for(let x = 0; x < 1200; x += 120) out.push(`<rect x="${x + 4}" y="6" width="112" height="250" rx="14" fill="none" stroke="${dark(wall, .06)}" stroke-width="2"/><rect x="${x + 4}" y="268" width="112" height="244" rx="14" fill="none" stroke="${dark(wall, .06)}" stroke-width="2"/>`);
      break;
    case 'plasterwood':
      out.push(`<rect x="0" y="330" width="1200" height="190" fill="${lit('#8a6a45')}"/>`);
      for(let x = 0; x < 1200; x += 60) out.push(`<rect x="${x + 6}" y="342" width="48" height="164" rx="2" fill="none" stroke="${dark(lit('#8a6a45'), .25)}" stroke-width="2"/>`);
      out.push(`<rect x="0" y="324" width="1200" height="8" fill="${lit('#6b4f33')}"/><rect x="0" y="40" width="1200" height="6" fill="${lit('#6b4f33')}"/>`);
      break;
    case 'tile':
      out.push(`<rect x="0" y="300" width="1200" height="220" fill="${lit('#f6efe2')}"/>`);
      for(let y = 300; y < 520; y += 22) out.push(`<rect x="0" y="${y}" width="1200" height="1.2" fill="${dark(lit('#f6efe2'), .14)}"/>`);
      for(let y = 300, k = 0; y < 520; y += 22, k++) for(let x = (k % 2) * 22; x < 1200; x += 44) out.push(`<rect x="${x}" y="${y}" width="1.2" height="22" fill="${dark(lit('#f6efe2'), .14)}"/>`);
      out.push(`<rect x="0" y="296" width="1200" height="6" fill="${lit('#b2483a')}"/>`);
      break;
    default:
      out.push(`<rect x="0" y="300" width="1200" height="2" fill="${tdMix(accent, wall, .6)}" opacity=".5"/>`);
  }
  out.push(`<rect y="0" width="1200" height="40" fill="${dark(wall, .08)}" opacity=".5"/>`);

  /* ---------- 床 ---------- */
  out.push(`<rect y="520" width="1200" height="100" fill="${floor}"/>`);
  switch(st.floor[0]){
    case 'wood': case 'deck':
      for(let y = 532; y < 620; y += st.floor[0] === 'deck' ? 16 : 22) out.push(`<rect x="0" y="${y}" width="1200" height="1.2" fill="${dark(floor, .2)}"/>`);
      break;
    case 'tatami':
      for(let x = 0; x < 1200; x += 240) out.push(`<rect x="${x}" y="520" width="4" height="100" fill="${lit('#3d4a3a')}"/>`);
      out.push(`<rect x="0" y="568" width="1200" height="3" fill="${lit('#3d4a3a')}"/>`);
      break;
    case 'ice':
      out.push(`<ellipse cx="320" cy="585" rx="190" ry="22" fill="${lit('#9aa8b8')}" opacity=".9"/>`);
      break;
    case 'metal':
      for(let x = 0; x < 1200; x += 60) out.push(`<rect x="${x}" y="520" width="1.5" height="100" fill="${dark(floor, .2)}"/>`);
      break;
    case 'stone': case 'marble':
      for(let x = 0; x < 1200; x += 120) out.push(`<rect x="${x}" y="520" width="1.2" height="100" fill="${dark(floor, .12)}"/>`);
      out.push(`<rect x="0" y="566" width="1200" height="1.2" fill="${dark(floor, .12)}"/>`);
      break;
    case 'checker':
      for(let y = 520, k = 0; y < 620; y += 25, k++) for(let x = (k % 2) * 50; x < 1200; x += 100) out.push(`<rect x="${x}" y="${y}" width="50" height="25" fill="${lit('#2a2a2e')}" opacity=".9"/>`);
      break;
    case 'carpet': {
      out.push(`<rect x="0" y="520" width="1200" height="100" fill="url(#rm-carpet)" opacity=".18"/>`);
      const r = tdRand('carpet');
      for(let i = 0; i < 4; i++) out.push(`<ellipse cx="${(r() * 1200).toFixed(0)}" cy="${(540 + r() * 70).toFixed(0)}" rx="${(30 + r() * 40).toFixed(0)}" ry="8" fill="${dark(floor, .2)}" opacity=".5"/>`);
      break;
    }
  }
  out.push(`<rect y="516" width="1200" height="6" fill="${woodDark}"/>`);

  // オルガロン：壁と床にインクの飛び散り
  if(st.props.includes('ink')){
    const ir = tdRand('ink-wall');
    [[30, 60, 26], [880, 70, 30], [720, 330, 22], [905, 300, 16], [30, 300, 18], [1180, 250, 24], [640, 20, 14], [760, 60, 12], [1000, 470, 20], [400, 40, 12]].forEach(([x, y, sz], i) => out.push(tdInk(ir, x, y, sz, lit(TD_INKS[i % TD_INKS.length]), .85)));
    [[300, 590, 34], [700, 600, 28], [520, 560, 18], [980, 600, 24]].forEach(([x, y, sz], i) => out.push(tdInk(ir, x, y, sz, lit(TD_INKS[(i + 2) % TD_INKS.length]), .8)));
  }

  /* ---------- 窓から入る光（昼は日差し、夜は街や樹の光） ---------- */
  if(L > .35 && st.lamp !== 'ceiling' && id !== 'garhyura') out.push(`<path d="M${WX} ${WY + WH} L${WX + WW} ${WY + WH} L${WX + WW + 160} 620 L${WX - 60} 620Z" fill="${tdMix('#fff6df', ph.bottom, .3)}" opacity="${((L - .35) * .28).toFixed(3)}"/>`);
  const nightGlow = id === 'garhyura' ? .7 : (id === 'maimok' ? .75 : N);
  if(nightGlow > .2) out.push(`<ellipse cx="${WX + WW / 2}" cy="${WY + WH / 2 + 60}" rx="${WW * .9}" ry="330" fill="url(#rm-winglow)" opacity="${(nightGlow * .8).toFixed(2)}"/>`);

  /* ---------- 窓・カーテン ---------- */
  out.push(tdWindow(st, nation, now, wx, ph, Object.assign({ frame }, G)));
  out.push(tdCurtains(st, G, lit, dark, accent, woodDark));

  /* ---------- 壁の小物 ---------- */
  out.push(tdWallProps(st, id, lit, dark, accent, roomL));

  /* ---------- 部屋の右側（国ごとの家具） ---------- */
  out.push(tdFeature(st, id, lit, dark, accent, roomL, now));

  /* ---------- 時計とカレンダー ---------- */
  out.push(tdClock(st, now, lit, dark, wall, accent));
  out.push(tdCalendar(st, now, info, lit, dark, wall, accent, roomL));

  /* ---------- 机 ---------- */
  out.push(`<ellipse cx="650" cy="538" rx="320" ry="12" fill="#000" opacity=".16"/>`);
  if(st.desk === 'table'){
    out.push(`<rect x="350" y="452" width="590" height="16" rx="3" fill="${wood}"/><rect x="380" y="468" width="12" height="68" fill="${woodDark}"/><rect x="898" y="468" width="12" height="68" fill="${woodDark}"/>`);
    out.push(`<path d="M350 452 L940 452 L940 462 L350 462Z" fill="${lit('#f3ead9')}" opacity=".85"/>`);
  } else if(st.desk === 'workbench'){
    out.push(`<rect x="350" y="448" width="590" height="20" rx="1" fill="${wood}"/><rect x="350" y="448" width="590" height="3" fill="#ffffff" opacity=".12"/><rect x="370" y="468" width="16" height="70" fill="${woodDark}"/><rect x="904" y="468" width="16" height="70" fill="${woodDark}"/><rect x="386" y="500" width="518" height="6" fill="${woodDark}"/>`);
  } else if(st.desk === 'bench'){
    // 金属の作業台。何も置かれていない
    out.push(`<rect x="370" y="452" width="560" height="10" fill="${wood}"/><rect x="384" y="462" width="6" height="74" fill="${woodDark}"/><rect x="912" y="462" width="6" height="74" fill="${woodDark}"/><path d="M390 470 L912 530 M912 470 L390 530" stroke="${woodDark}" stroke-width="3"/>`);
  } else {
    out.push(`<rect x="360" y="452" width="580" height="14" rx="${st.desk === 'round' ? 7 : 2}" fill="${wood}"/><rect x="360" y="452" width="580" height="3" rx="2" fill="#ffffff" opacity=".14"/><rect x="380" y="466" width="10" height="70" fill="${woodDark}"/><rect x="910" y="466" width="10" height="70" fill="${woodDark}"/><rect x="390" y="466" width="520" height="5" fill="${woodDark}" opacity=".6"/>`);
  }

  /* ---------- 明かり・机の上 ---------- */
  out.push(tdLampGlow(st, lampOn, L));
  out.push(tdLamp(st, lampOn, lit, dark, L));
  out.push(tdDeskProps(st, id, lit, dark, accent, roomL));
  out.push(tdTerminal(st, info, lit, roomL));

  /* ---------- 床・窓辺 ---------- */
  out.push(tdFloorProps(st, id, lit, dark, accent, roomL, ph.h, G));

  if(st.props.includes('ink')){
    const ir = tdRand('ink-front');
    [[470, 448, 10], [620, 452, 8], [880, 450, 9]].forEach(([x, y, sz], i) => out.push(tdInk(ir, x, y, sz, lit(TD_INKS[(i + 4) % TD_INKS.length]), .85)));
  }

  /* ---------- 漂うもの・陰り ---------- */
  if(st.props.includes('smoke')){
    const r = tdRand('smoke-room');
    let s = '';
    for(let i = 0; i < 7; i++) s += `<ellipse class="rm-drift" style="animation-delay:-${(r() * 20).toFixed(1)}s;animation-duration:${(18 + r() * 14).toFixed(0)}s" cx="${(r() * 1200).toFixed(0)}" cy="${(120 + r() * 360).toFixed(0)}" rx="${(90 + r() * 120).toFixed(0)}" ry="${(18 + r() * 20).toFixed(0)}" fill="#f6d6e6" opacity="${(.1 + r() * .08).toFixed(2)}" filter="url(#rm-blur8)"/>`;
    out.push(`<g pointer-events="none">${s}</g>`);
    out.push(`<g class="rm-fog" pointer-events="none"><rect width="1200" height="620" fill="url(#rm-pink)" fill-opacity="${(.1 + .12 * L).toFixed(2)}"/></g>`);
  }
  if(st.props.includes('frost')){
    // 冷え切った部屋：壁の下のほうにうっすら霜
    out.push(`<rect x="0" y="440" width="1200" height="80" fill="url(#rm-frostwall)"/>`);
  }
  // 壁際の陰、床の陰影、部屋の四隅の暗さ
  out.push(`<rect x="0" y="440" width="1200" height="80" fill="url(#rm-ao)" pointer-events="none"/>`);
  out.push(`<rect x="0" y="520" width="1200" height="100" fill="url(#rm-floorfade)" pointer-events="none"/>`);
  out.push(`<rect width="1200" height="620" fill="url(#rm-vignette)" pointer-events="none"/>`);
  const shade = lampOn && st.lamp !== 'ceiling' ? N * .22 : (st.lamp === 'hikaritake' ? N * .16 : 0);
  if(shade) out.push(`<rect width="1200" height="620" fill="#05080f" opacity="${shade.toFixed(3)}" pointer-events="none"/>`);

  const hazeColor = { garhyura:'#b8261c', maimok:'#ff7ac8' }[id] || ph.bottom;
  const redSky = [tdMix('#2a0608', '#7a1414', L * .6 + .2), tdMix('#5a0c0e', '#c42a1e', L * .5 + .3)];
  const pinkSky = [tdMix('#120a24', '#6a3a7a', L), tdMix('#ff3fae', '#ffb3d9', L * .6)];

  return `
  <svg class="rm-svg" viewBox="0 0 1200 620" role="img" aria-label="${nation.title}の部屋。${ph.label}、窓の外は${wx.label}。">
    <defs>
      <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ph.top}"/><stop offset="1" stop-color="${ph.bottom}"/></linearGradient>
      <linearGradient id="rm-redsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${redSky[0]}"/><stop offset="1" stop-color="${redSky[1]}"/></linearGradient>
      <linearGradient id="rm-pinksky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pinkSky[0]}"/><stop offset="1" stop-color="${pinkSky[1]}"/></linearGradient>
      <linearGradient id="rm-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tdMix('#0e2a3a', '#4fc2b4', L)}"/><stop offset="1" stop-color="${tdMix('#06161f', '#1f8a8a', L)}"/></linearGradient>
      <radialGradient id="rm-winglow"><stop offset="0" stop-color="${st.glow}" stop-opacity=".32"/><stop offset=".6" stop-color="${st.glow}" stop-opacity=".08"/><stop offset="1" stop-color="${st.glow}" stop-opacity="0"/></radialGradient>
      <radialGradient id="rm-lamp"><stop offset="0" stop-color="#4FDAE0" stop-opacity=".45"/><stop offset=".45" stop-color="#3a8fd6" stop-opacity=".14"/><stop offset="1" stop-color="#3a8fd6" stop-opacity="0"/></radialGradient>
      <radialGradient id="rm-warm"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".42"/><stop offset=".5" stop-color="#ffb070" stop-opacity=".12"/><stop offset="1" stop-color="#ffb070" stop-opacity="0"/></radialGradient>
      <radialGradient id="rm-pinkglow"><stop offset="0" stop-color="#ff8fc8" stop-opacity=".5"/><stop offset="1" stop-color="#ff8fc8" stop-opacity="0"/></radialGradient>
      <radialGradient id="rm-hika"><stop offset="0" stop-color="#9dffd8" stop-opacity=".5"/><stop offset="1" stop-color="#9dffd8" stop-opacity="0"/></radialGradient>
      <linearGradient id="rm-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf6ff" stop-opacity=".35"/><stop offset="1" stop-color="#eaf6ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="rm-pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9fcf"/><stop offset="1" stop-color="#f6b8d8"/></linearGradient>
      <linearGradient id="rm-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7dde3" stop-opacity=".55"/><stop offset=".6" stop-color="#d7dde3" stop-opacity=".85"/><stop offset="1" stop-color="#e6eaee" stop-opacity=".95"/></linearGradient>
      <linearGradient id="rm-rust" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5a3a"/><stop offset=".5" stop-color="#8a5a3a" stop-opacity="0"/><stop offset="1" stop-color="#6a4a3a"/></linearGradient>
      <radialGradient id="rm-frost"><stop offset="0" stop-color="#f2f7fb" stop-opacity=".75"/><stop offset=".55" stop-color="#e6eef5" stop-opacity=".35"/><stop offset="1" stop-color="#e6eef5" stop-opacity="0"/></radialGradient>
      <linearGradient id="rm-frostwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f0f6" stop-opacity="0"/><stop offset="1" stop-color="#e8f0f6" stop-opacity=".22"/></linearGradient>
      <linearGradient id="rm-water" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fe8ff" stop-opacity=".15"/><stop offset=".5" stop-color="#7fe8ff" stop-opacity=".55"/><stop offset="1" stop-color="#7fe8ff" stop-opacity=".15"/></linearGradient>
      <pattern id="rm-carpet" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 0 L24 12 L12 24 L0 12Z" fill="none" stroke="#fff" stroke-width="1"/></pattern>
      <linearGradient id="rm-hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hazeColor}" stop-opacity="0"/><stop offset=".5" stop-color="${hazeColor}" stop-opacity=".85"/><stop offset="1" stop-color="${hazeColor}" stop-opacity="0"/></linearGradient>
      <radialGradient id="rm-winshade" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
      <radialGradient id="rm-vignette" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></radialGradient>
      <linearGradient id="rm-ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
      <linearGradient id="rm-floorfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <filter id="rm-blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="rm-blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
      <clipPath id="rm-win"><rect x="0" y="0" width="${WW}" height="${WH}" rx="${st.window === 'round' ? 80 : (st.window === 'rounded' ? 26 : 0)}"/></clipPath>
      <clipPath id="rm-win-arch"><path d="M0 ${WH} L0 90 Q0 -28 ${WW / 2} -28 Q${WW} -28 ${WW} 90 L${WW} ${WH}Z"/></clipPath>
      <linearGradient id="rm-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tdMix('#f4fbff', '#cfe6ff', N)}"/><stop offset=".5" stop-color="${tdMix('#bfe0f4', '#8fb8e8', N)}"/><stop offset="1" stop-color="${tdMix('#8fc0e0', '#5a7ab8', N)}"/></linearGradient>
      <linearGradient id="rm-icein" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lit('#f6fbff')}"/><stop offset="1" stop-color="${lit('#9fc4e0')}"/></linearGradient>
      <linearGradient id="rm-dogfur" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${lit('#ffffff')}"/><stop offset=".6" stop-color="${lit('#f1f5f8')}"/><stop offset="1" stop-color="${lit('#d4dee8')}"/></linearGradient>
      <clipPath id="rm-flowclip"><rect x="934" y="134" width="232" height="16"/></clipPath>
      <clipPath id="rm-screen"><rect x="702" y="364" width="166" height="60"/></clipPath>
    </defs>
    ${out.join('')}
  </svg>`;
}

/* ---------- 窓 ---------- */
function tdWindow(st, nation, now, wx, ph, g){
  const { WX, WY, WW, WH, frame } = g;
  const L = ph.light, id = nation.id, h = ph.h;
  const custom = TD_VIEWS[id];
  const clearish = ['clear', 'partly', 'managed', 'dome', 'indoor'].includes(wx.kind);
  const showSky = !['sertcity', 'garhyura', 'maimok'].includes(id) && !(TD_OWN_SKY[id] && L < .5);

  let celestial = '', stars = '', clouds = '', fx = '';
  if(showSky && wx.kind !== 'fog'){
    if(h >= 5.5 && h <= 18.6){
      const t = (h - 5.5) / 13.1, sx = 30 + t * (WW - 60), sy = 250 - Math.sin(Math.PI * t) * 210;
      const op = clearish ? 1 : .35;
      celestial = `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="34" fill="#fff6dc" opacity="${.18 * op}"/><circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="15" fill="${tdMix('#ffb27a', '#fff8e6', Math.sin(Math.PI * t))}" opacity="${op}"/>`;
    } else {
      const t = ((h >= 18 ? h - 18 : h + 6)) / 12, mx = 40 + t * (WW - 80), my = 220 - Math.sin(Math.PI * t) * 180;
      const op = clearish ? 1 : .3;
      celestial = `<circle cx="${mx.toFixed(0)}" cy="${my.toFixed(0)}" r="26" fill="#cfe2ff" opacity="${.12 * op}"/><circle cx="${mx.toFixed(0)}" cy="${my.toFixed(0)}" r="11" fill="#eef4ff" opacity="${op}"/><circle cx="${(mx + 5).toFixed(0)}" cy="${(my - 3).toFixed(0)}" r="10" fill="${ph.top}" opacity="${op * .9}"/>`;
    }
    if(L < .3 && clearish){
      const r = tdRand('stars:' + id);
      for(let i = 0; i < 70; i++) stars += `<circle cx="${(r() * WW).toFixed(0)}" cy="${(r() * 200).toFixed(0)}" r="${(r() * 1.1 + .3).toFixed(1)}" fill="#fff" opacity="${((.4 + r() * .6) * (1 - L / .3)).toFixed(2)}" class="${r() < .25 ? 'rm-twinkle' : ''}"/>`;
    }
    const nCloud = { partly:3, cloudy:7, rain:7, heavy:8, snow:6, blizzard:8, clear:1 }[wx.kind] || 0;
    if(nCloud && id !== 'hubert'){
      const r = tdRand('cloud:' + id + tdYmd(now));
      const cc = tdMix(tdMix('#3a4560', '#ffffff', L), '#8f99a8', wx.kind === 'partly' || wx.kind === 'clear' ? 0 : .45);
      for(let i = 0; i < nCloud; i++){
        const x = r() * WW, y = 20 + r() * 120, s = 30 + r() * 50;
        clouds += `<g class="rm-cloud" style="animation-duration:${(70 + r() * 60).toFixed(0)}s;animation-delay:-${(r() * 60).toFixed(0)}s"><ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${s.toFixed(0)}" ry="${(s * .34).toFixed(0)}" fill="${cc}" opacity=".85"/><ellipse cx="${(x + s * .35).toFixed(0)}" cy="${(y - s * .16).toFixed(0)}" rx="${(s * .5).toFixed(0)}" ry="${(s * .32).toFixed(0)}" fill="${cc}" opacity=".85"/></g>`;
      }
    }
  }
  const r2 = tdRand('fx:' + id);
  if(wx.kind === 'rain' || wx.kind === 'heavy'){
    const n = wx.kind === 'heavy' ? 90 : 50;
    for(let i = 0; i < n; i++){ const x = r2() * (WW + 60), y = r2() * WH; fx += `<line class="rm-rain" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 6).toFixed(0)}" y2="${(y + 18).toFixed(0)}" style="animation-delay:-${(r2()).toFixed(2)}s"/>`; }
  }
  if((wx.kind === 'snow' || wx.kind === 'blizzard') && id !== 'garhyura'){
    const n = wx.kind === 'blizzard' ? 110 : 60;
    for(let i = 0; i < n; i++) fx += `<circle class="rm-snow ${wx.kind === 'blizzard' ? 'is-blizzard' : ''}" cx="${(r2() * WW).toFixed(0)}" cy="${(r2() * WH).toFixed(0)}" r="${(1 + r2() * 1.8).toFixed(1)}" style="animation-delay:-${(r2() * 6).toFixed(2)}s;animation-duration:${(4 + r2() * 4).toFixed(1)}s"/>`;
  }
  if(wx.kind === 'fog' && id !== 'maimok') fx += `<g class="rm-fog"><rect y="-40" width="${WW}" height="${WH + 40}" fill="url(#rm-fog)"/></g>`;
  if(wx.kind === 'sand') fx += `<g class="rm-fog"><rect y="-40" width="${WW}" height="${WH + 40}" fill="#c9a374" fill-opacity=".45"/></g>`;

  const scene = custom ? custom(WW, WH, L, ph, wx, now) : tdScene(id, now, wx, ph, WW, WH);
  const arch = st.window === 'arch', heavy = st.window === 'heavy', round = st.window === 'round';
  const archPath = (pad) => `M${WX - pad} ${WY + WH + pad} L${WX - pad} ${WY + 90} Q${WX - pad} ${WY - 28 - pad} ${WX + WW / 2} ${WY - 28 - pad} Q${WX + WW + pad} ${WY - 28 - pad} ${WX + WW + pad} ${WY + 90} L${WX + WW + pad} ${WY + WH + pad}Z`;
  const pad = heavy ? 20 : 12;

  const s = [];
  s.push(`<g class="rm-hot" data-target="rm-card-window" tabindex="0" role="button" aria-label="窓の外：${wx.label}">`);
  s.push(arch ? `<path d="${archPath(12)}" fill="${frame}"/>` : `<rect x="${WX - pad}" y="${WY - pad}" width="${WW + pad * 2}" height="${WH + pad * 2}" rx="${round ? 90 : (st.window === 'rounded' ? 36 : 3)}" fill="${frame}"/>`);
  s.push(`<g transform="translate(${WX} ${WY})" clip-path="url(#${arch ? 'rm-win-arch' : 'rm-win'})">`);
  s.push(`<rect y="-40" width="${WW}" height="${WH + 40}" fill="url(#rm-sky)"/>`);
  s.push(stars + celestial);
  s.push(`<g${st.window === 'wide' ? ' class="rm-rotate"' : ''}>${clouds}${scene}</g>`);
  s.push(fx);
  if(!custom) s.push(`<rect x="-60" y="${(WH * .42).toFixed(0)}" width="${WW + 120}" height="${(WH * .3).toFixed(0)}" fill="url(#rm-hz)" opacity=".55"/>`);
  // 窓ガラス：内側の陰り、斜めの映り込み
  s.push(`<rect y="-40" width="${WW}" height="${WH + 40}" fill="url(#rm-winshade)"/>`);
  s.push(`<path d="M${WW * .08} -40 L${WW * .2} -40 L${WW * .02} ${WH} L-${WW * .1} ${WH}Z" fill="#ffffff" opacity="${(.03 + .03 * L).toFixed(3)}"/><path d="M${WW * .26} -40 L${WW * .3} -40 L${WW * .12} ${WH} L${WW * .08} ${WH}Z" fill="#ffffff" opacity="${(.025 + .025 * L).toFixed(3)}"/>`);
  if(heavy){
    // 窓の四隅ににじむ霜と、細い氷の結晶
    [[0, 0, 110], [WW, 0, 80], [0, WH, 90], [WW, WH, 120]].forEach(([x, y, rr]) => s.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="url(#rm-frost)"/>`));
    const fr = tdRand('frost');
    for(let i = 0; i < 26; i++){
      const corner = [[0, 0], [WW, 0], [0, WH], [WW, WH]][i % 4], a = fr() * Math.PI * 2, len = 10 + fr() * 40;
      const x = corner[0] + (corner[0] ? -1 : 1) * fr() * 60, y = corner[1] + (corner[1] ? -1 : 1) * fr() * 60;
      s.push(`<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${(Math.cos(a) * len).toFixed(0)} ${(Math.sin(a) * len).toFixed(0)}" stroke="#f4f8fb" stroke-width=".8" opacity=".6"/>`);
    }
  }
  s.push(`</g>`);
  // 桟
  if(st.window === 'shoji'){
    for(let k = 1; k < 4; k++) s.push(`<rect x="${WX + WW * k / 4 - 2}" y="${WY}" width="4" height="${WH}" fill="${frame}"/>`);
    s.push(`<rect x="${WX}" y="${WY + WH / 2 - 2}" width="${WW}" height="4" fill="${frame}"/>`);
  } else if(st.window === 'panel'){
    s.push(`<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" fill="none" stroke="#4FDAE0" stroke-width="1" opacity=".35"/><text x="${WX + 12}" y="${WY + 22}" class="rm-t rm-t-mono" fill="#4FDAE0" opacity=".8">VIEW ・ INNER CITY</text>`);
  } else if(st.window === 'rounded'){
    s.push(`<rect x="${WX + WW * .62 - 2}" y="${WY}" width="4" height="${WH}" fill="${frame}" opacity=".9"/>`);
  } else if(st.window === 'wide'){
    s.push(`<rect x="${WX + WW / 2 - 2}" y="${WY}" width="4" height="${WH}" fill="${frame}" opacity=".9"/>`);
  } else if(!round){
    s.push(`<rect x="${WX + WW / 2 - 4}" y="${WY - (arch ? 28 : 0)}" width="8" height="${WH + (arch ? 28 : 0)}" fill="${frame}"/>`);
    if(!heavy) s.push(`<rect x="${WX}" y="${WY + 150}" width="${WW}" height="6" fill="${frame}"/>`);
  }
  if(heavy) for(let y = WY - 12; y < WY + WH + 14; y += 46) s.push(`<circle cx="${WX - 10}" cy="${y}" r="3" fill="${tdMix(frame, '#000', .4)}"/><circle cx="${WX + WW + 10}" cy="${y}" r="3" fill="${tdMix(frame, '#000', .4)}"/>`);
  s.push(`<rect x="${WX - 22}" y="${WY + WH + 10}" width="${WW + 44}" height="12" rx="2" fill="${frame}"/>`);
  s.push(arch ? `<path class="rm-hot-ring" d="${archPath(12)}"/>` : `<rect class="rm-hot-ring" x="${WX - pad}" y="${WY - pad}" width="${WW + pad * 2}" height="${WH + pad * 2}" rx="${round ? 90 : (st.window === 'rounded' ? 36 : 3)}"/>`);
  s.push(`</g>`);
  return s.join('');
}

/* ---------- カーテン・障子 ---------- */
function tdCurtains(st, g, lit, dark, accent, woodDark){
  const { WX, WW } = g;
  const s = [];
  if(st.curtain){
    const c = lit(tdMix(accent, '#f0f2f5', .55)), cR = WX + WW + 50;
    s.push(`<path d="M${WX - 50} 40 L${WX + 10} 40 C${WX + 2} 160 ${WX + 16} 300 ${WX + 6} 446 L${WX - 50} 446Z" fill="${c}"/>`);
    s.push(`<path d="M${WX - 34} 40 C${WX - 30} 180 ${WX - 38} 300 ${WX - 28} 446" stroke="${dark(c, .18)}" stroke-width="3" fill="none"/>`);
    if(st.curtain === 'velvet'){
      // 黒のビロードに金の縁取りと房
      const v = lit('#1e1a1e'), gd = lit('#c9a24a');
      s.length = 0;
      s.push(`<path d="M${WX - 58} 36 L${WX + 14} 36 C${WX + 4} 160 ${WX + 20} 300 ${WX + 8} 450 L${WX - 58} 450Z" fill="${v}"/><path d="M${WX + 14} 36 C${WX + 4} 160 ${WX + 20} 300 ${WX + 8} 450" stroke="${gd}" stroke-width="3" fill="none"/>`);
      s.push(`<path d="M${cR - 64} 36 L${cR + 8} 36 L${cR + 8} 450 L${cR - 60} 450 C${cR - 70} 300 ${cR - 54} 160 ${cR - 64} 36Z" fill="${v}"/><path d="M${cR - 64} 36 C${cR - 54} 160 ${cR - 70} 300 ${cR - 60} 450" stroke="${gd}" stroke-width="3" fill="none"/>`);
      [[WX - 20, 250], [cR - 24, 250]].forEach(([x, y]) => s.push(`<path d="M${x - 30} ${y} Q${x} ${y + 14} ${x + 30} ${y}" stroke="${gd}" stroke-width="4" fill="none"/><path d="M${x + 26} ${y + 2} l-6 34 l12 0Z" fill="${gd}"/>`));
      s.push(`<path d="M${WX - 64} 30 L${WX + WW + 64} 30 L${WX + WW + 64} 62 Q${WX + WW / 2} 92 ${WX - 64} 62Z" fill="${v}"/><path d="M${WX - 64} 62 Q${WX + WW / 2} 92 ${WX + WW + 64} 62" stroke="${gd}" stroke-width="3" fill="none"/>`);
      return s.join('');
    }
    if(st.curtain === 'torn'){
      // 片側は外れて垂れ下がっている
      s.push(`<path d="M${cR - 60} 40 L${cR} 40 L${cR} 300 L${cR - 30} 360 L${cR - 44} 290 Z" fill="${c}"/>`);
    } else {
      s.push(`<path d="M${cR - 60} 40 L${cR} 40 L${cR} 446 L${cR - 56} 446 C${cR - 64} 300 ${cR - 50} 160 ${cR - 60} 40Z" fill="${c}"/>`);
      s.push(`<path d="M${cR - 18} 40 C${cR - 24} 180 ${cR - 14} 300 ${cR - 20} 446" stroke="${dark(c, .18)}" stroke-width="3" fill="none"/>`);
    }
    s.push(`<rect x="${WX - 64}" y="34" width="${WW + 128}" height="7" rx="3" fill="${woodDark}" ${st.curtain === 'torn' ? `transform="rotate(1.5 ${WX} 34)"` : ''}/>`);
  }
  if(st.window === 'shoji'){
    const p = lit('#f4efe2'), fr = lit('#6e5238');
    [[WX - 78, 62], [WX + WW + 16, 62]].forEach(([x, w]) => {
      s.push(`<rect x="${x}" y="44" width="${w}" height="400" fill="${p}" stroke="${fr}" stroke-width="4"/>`);
      for(let yy = 94; yy < 444; yy += 50) s.push(`<line x1="${x}" y1="${yy}" x2="${x + w}" y2="${yy}" stroke="${fr}" stroke-width="1.5"/>`);
      s.push(`<line x1="${x + w / 2}" y1="44" x2="${x + w / 2}" y2="444" stroke="${fr}" stroke-width="1.5"/>`);
    });
  }
  return s.join('');
}

/* ---------- 時計 ---------- */
function tdClock(st, now, lit, dark, wall, accent){
  const hr = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * Math.PI * 2;
  const mn = now.getMinutes() / 60 * Math.PI * 2;
  const CX = 836, CY = 62;
  if(st.clock === 'none') return '';
  if(st.clock === 'digital'){
    const t = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    return `<rect x="782" y="42" width="108" height="40" rx="3" fill="#0f1a2c"/><text x="836" y="70" text-anchor="middle" class="rm-t rm-t-clock" fill="#4FDAE0">${t}</text>`;
  }
  const rim = dark(lit('#a8957a'), .25), r = 28;
  let s = `<circle cx="${CX}" cy="${CY}" r="${r}" fill="${tdMix(wall, '#ffffff', .5)}" stroke="${rim}" stroke-width="3"/>`;
  for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; s += `<line x1="${(CX + Math.sin(a) * r * .8).toFixed(1)}" y1="${(CY - Math.cos(a) * r * .8).toFixed(1)}" x2="${(CX + Math.sin(a) * r * .9).toFixed(1)}" y2="${(CY - Math.cos(a) * r * .9).toFixed(1)}" stroke="${rim}" stroke-width="${i % 3 ? 1 : 2}"/>`; }
  s += `<line x1="${CX}" y1="${CY}" x2="${(CX + Math.sin(hr) * 13).toFixed(1)}" y2="${(CY - Math.cos(hr) * 13).toFixed(1)}" stroke="#1a2233" stroke-width="3" stroke-linecap="round"/>`;
  s += `<line x1="${CX}" y1="${CY}" x2="${(CX + Math.sin(mn) * 20).toFixed(1)}" y2="${(CY - Math.cos(mn) * 20).toFixed(1)}" stroke="#1a2233" stroke-width="2" stroke-linecap="round"/><circle cx="${CX}" cy="${CY}" r="2.5" fill="${accent}"/>`;
  return s;
}

/* ---------- カレンダー ---------- */
function tdCalendar(st, now, info, lit, dark, wall, accent, L){
  const ev = info.events[0];
  const line1 = ev ? tdShort(ev.name, 9) : '行事なし';
  const line2 = ev ? (info.events.length > 1 ? `ほか${info.events.length - 1}件` : ev.type)
                   : (info.next ? `次：${info.next.month}/${info.next.day} あと${info.next.days}日` : '');
  const digital = st.calendar === 'digital';
  const paperBase = st.calendar === 'pinned' ? '#d9d4c4' : (st.calendar === 'torn' ? '#eadde4' : '#f7f8fa');
  const bg = digital ? '#0f1a2c' : tdMix('#8b94a6', paperBase, .25 + .75 * Math.max(L, .35));
  const fg = digital ? '#e7ecf3' : '#1a2233';
  const head = digital ? '#1b2b45' : (st.calendar === 'pinned' ? '#5a1414' : accent);
  const X = 772, Y = 108, Wd = 128, Ht = 178;
  const tf = st.calendar === 'torn' ? ` transform="rotate(-5 ${X + Wd / 2} ${Y})"` : '';
  let extra = '';
  if(st.calendar === 'pinned') extra = `<circle cx="${X + Wd / 2}" cy="${Y + 6}" r="4" fill="#8a8f96"/>`;
  if(st.calendar === 'torn') extra = `<path d="M${X + Wd - 30} ${Y + Ht} L${X + Wd} ${Y + Ht - 36} L${X + Wd} ${Y + Ht}Z" fill="${wall}"/>`;
  return `
    <g class="rm-hot" data-target="rm-card-events" tabindex="0" role="button" aria-label="今日の行事：${ev ? ev.name : '行事なし'}"><g${tf}>
      <rect x="${X}" y="${Y}" width="${Wd}" height="${Ht}" rx="3" fill="${bg}" stroke="${dark(wall, .15)}"/>
      <rect x="${X}" y="${Y}" width="${Wd}" height="32" rx="3" fill="${head}"/><rect x="${X}" y="${Y + 20}" width="${Wd}" height="12" fill="${head}"/>
      <text x="${X + Wd / 2}" y="${Y + 22}" text-anchor="middle" class="rm-t rm-t-month" fill="${digital ? '#4FDAE0' : tdContrast(head)}">${now.getMonth() + 1}月</text>
      <text x="${X + Wd / 2}" y="${Y + 98}" text-anchor="middle" class="rm-t rm-t-day" fill="${fg}">${now.getDate()}</text>
      <line x1="${X + 14}" y1="${Y + 118}" x2="${X + Wd - 14}" y2="${Y + 118}" stroke="${tdMix(fg, bg, .7)}"/>
      <text x="${X + Wd / 2}" y="${Y + 142}" text-anchor="middle" class="rm-t rm-t-ev" fill="${ev ? fg : tdMix(fg, bg, .4)}">${line1}</text>
      <text x="${X + Wd / 2}" y="${Y + 164}" text-anchor="middle" class="rm-t rm-t-sub" fill="${tdMix(fg, bg, .3)}">${line2}</text>
      ${ev ? `<circle cx="${X + Wd - 16}" cy="${Y + 80}" r="5" fill="${digital ? '#4FDAE0' : head}" class="rm-pulse-dot"/>` : ''}
      ${extra}
      <rect class="rm-hot-ring" x="${X}" y="${Y}" width="${Wd}" height="${Ht}" rx="3"/>
    </g></g>`;
}

/* ---------- 明かり ---------- */
function tdLampGlow(st, on, L){
  if(st.lamp === 'ceiling') return `<rect x="0" y="0" width="1200" height="300" fill="url(#rm-ceil)"/>`;
  if(st.lamp === 'hikaritake'){
    const k = Math.max(0, 1 - L / .5);
    return k ? `<circle cx="1000" cy="520" r="170" fill="url(#rm-hika)" opacity="${k.toFixed(2)}"/>` : '';
  }
  if(!on) return '';
  const op = st.lamp === 'bulb' ? .28 : 1 - L / .62;
  const grad = { bulb:'rm-warm', andon:'rm-warm', brass:'rm-warm', pendant:'rm-warm', pink:'rm-pinkglow' }[st.lamp] || 'rm-lamp';
  if(st.lamp === 'pendant') return `<ellipse cx="660" cy="420" rx="420" ry="220" fill="url(#rm-warm)" opacity="${Math.min(1, op * 1.2).toFixed(2)}"/>`;
  const cx = st.lamp === 'bulb' ? 620 : 452, cy = st.lamp === 'bulb' ? 330 : 380;
  return `<circle cx="${cx}" cy="${cy}" r="230" fill="url(#${grad})" opacity="${op.toFixed(2)}"/>`;
}

function tdLamp(st, on, lit, dark, L){
  switch(st.lamp){
    case 'pendant': {
      // 食卓の上の吊り灯り（電気の灯り。火は使わない）
      let p = '';
      [[470, 250], [650, 268]].forEach(([x, y]) => {
        p += `<line x1="${x}" y1="0" x2="${x}" y2="${y}" stroke="${lit('#3a2a20')}" stroke-width="1.5"/><path d="M${x - 26} ${y + 24} Q${x} ${y - 10} ${x + 26} ${y + 24}Z" fill="${lit('#b2483a')}"/><ellipse cx="${x}" cy="${y + 24}" rx="26" ry="5" fill="${on ? '#ffd38a' : lit('#e8c8a0')}"/>`;
        if(on) p += `<ellipse cx="${x}" cy="${y + 26}" rx="18" ry="6" fill="#fff1c9" class="rm-lamp-warm"/>`;
      });
      return p;
    }
    case 'ceiling':
      return `<rect x="300" y="0" width="600" height="8" fill="#eaf6ff" opacity=".9"/><rect x="300" y="8" width="600" height="2" fill="#4FDAE0" opacity=".6"/>`;
    case 'hikaritake':
      return `<path d="M420 452 L460 452 L455 440 L425 440Z" fill="${lit('#8a5a3a')}"/><path d="M432 440 q4 -14 12 -16" stroke="${lit('#4f8a4e')}" stroke-width="3" fill="none"/>`;
    case 'bulb':
      // 天井から下がる裸電球ひとつ
      return `<line x1="620" y1="0" x2="620" y2="300" stroke="#2a2e33" stroke-width="2"/><path d="M608 300 L632 300 L626 312 L614 312Z" fill="${lit('#3c4148')}"/><circle cx="620" cy="320" r="10" fill="#ffd38a" class="rm-lamp-warm rm-flicker"/>`;
    case 'andon':
      return `<rect x="404" y="370" width="58" height="80" rx="4" fill="${on ? '#fff3d6' : lit('#f1e9d6')}" stroke="${lit('#5a4632')}" stroke-width="3"/><line x1="433" y1="370" x2="433" y2="450" stroke="${lit('#5a4632')}" stroke-width="1.5"/><line x1="404" y1="410" x2="462" y2="410" stroke="${lit('#5a4632')}" stroke-width="1.5"/>${on ? '<rect x="408" y="374" width="50" height="72" fill="#ffd9a0" opacity=".35" class="rm-lamp-warm"/>' : ''}`;
    case 'pink':
      return `<g transform="rotate(14 440 452)"><ellipse cx="440" cy="452" rx="22" ry="5" fill="${lit('#7a5a68')}"/><rect x="437" y="400" width="6" height="50" fill="${lit('#c9a7b8')}"/><path d="M412 400 L468 400 L456 370 L424 370Z" fill="${on ? '#ffb3d9' : lit('#e8c8d8')}"/></g>`;
    case 'brass':
      return `<ellipse cx="440" cy="452" rx="24" ry="5" fill="${lit('#7a5a2a')}"/><path d="M440 450 L440 396" stroke="${lit('#b08a4a')}" stroke-width="5"/><path d="M414 396 L466 396 L456 366 L424 366Z" fill="${lit('#3f6b4a')}"/><ellipse cx="440" cy="398" rx="20" ry="4" fill="${on ? '#ffe2a8' : lit('#c8b080')}"/>`;
    default:
      return `<ellipse cx="440" cy="452" rx="26" ry="5" fill="${dark(lit('#8a7a64'), .3)}"/>
        <path d="M440 450 L448 400 L470 372" stroke="${tdMix('#3a4152', '#9aa3b2', L)}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M454 360 L494 372 L478 394 Z" fill="${tdMix('#3a4152', '#cfd6df', L)}"/>
        <ellipse cx="483" cy="384" rx="9" ry="4" fill="${on ? '#7fe8ee' : tdMix('#4a5466', '#e2e8ef', L)}" class="${on ? 'rm-lamp-on' : ''}" transform="rotate(32 483 384)"/>`;
  }
}

/* ---------- 机の端末 ---------- */
function tdTerminal(st, info, lit, L){
  const body = tdMix('#1d2433', '#2c3546', L);
  const headline = info.news[0] ? info.news[0].title : '新しいニュースはありません';
  let screen;
  if(st.terminal === 'offline'){
    screen = `<rect x="700" y="362" width="170" height="66" rx="2" fill="#0b0f16"/><text x="785" y="392" text-anchor="middle" class="rm-t rm-t-mono" fill="#d06a5a">NO SIGNAL</text><text x="785" y="412" text-anchor="middle" class="rm-t rm-t-sub" fill="#7d838c">外部ネットワークなし</text>`;
  } else if(st.terminal === 'noise'){
    const r = tdRand('noise');
    let lines = '';
    for(let i = 0; i < 14; i++) lines += `<rect x="${(700 + r() * 140).toFixed(0)}" y="${(364 + r() * 62).toFixed(0)}" width="${(10 + r() * 40).toFixed(0)}" height="2" fill="#ffb3d9" opacity="${(.2 + r() * .5).toFixed(2)}"/>`;
    screen = `<rect x="700" y="362" width="170" height="66" rx="2" fill="#2a1a26"/>${lines}<text x="708" y="376" class="rm-t rm-t-mono" fill="#ffb3d9">MOON CORE ・ 受信不安定</text><g clip-path="url(#rm-screen)"><text x="868" y="402" class="rm-t rm-t-ticker" fill="#f3d7e5" opacity=".75">${headline}</text></g>`;
  } else {
    screen = `<rect x="700" y="362" width="170" height="66" rx="2" fill="${tdMix('#0e1a2e', '#1b2b45', L)}"/><text x="708" y="376" class="rm-t rm-t-mono" fill="#4FDAE0">MOON CORE ・ NEWS</text><g clip-path="url(#rm-screen)"><text x="868" y="398" class="rm-t rm-t-ticker" fill="#e7ecf3">${headline}　　${info.news[1] ? info.news[1].title : ''}</text></g><rect x="708" y="410" width="${info.news.length ? 110 : 60}" height="3" rx="1.5" fill="#4FDAE0" opacity=".45"/><rect x="708" y="417" width="74" height="3" rx="1.5" fill="#9aa7bc" opacity=".35"/>`;
  }
  return `<g transform="translate(52 0)"><ellipse cx="785" cy="452" rx="70" ry="4" fill="#000" opacity=".18"/><g class="rm-hot" data-target="rm-card-news" tabindex="0" role="button" aria-label="端末：${st.terminal === 'offline' ? '外部ネットワークなし' : headline}"><rect x="692" y="354" width="186" height="82" rx="5" fill="${body}"/>${screen}<rect x="692" y="354" width="186" height="5" rx="2" fill="#ffffff" opacity=".06"/><rect x="775" y="436" width="20" height="16" fill="${body}"/><rect class="rm-hot-ring" x="692" y="354" width="186" height="82" rx="5"/></g></g>`;
}

/* ---------- 部屋の右側：国ごとの家具 ---------- */
function tdFeature(st, id, lit, dark, accent, L, now){
  const s = [];
  const r = tdRand('feature:' + id);
  switch(st.feature){
    case 'kyumaHome': {
      // 復元住宅：天翼紋の拓本、発掘品の陳列棚（ガラス）、復元した蒸気機関の模型
      const wood = lit('#6b4f33'), paper = lit('#efe2c4');
      s.push(`<rect x="944" y="44" width="210" height="130" fill="${paper}" stroke="${wood}" stroke-width="5"/><rect x="954" y="54" width="190" height="110" fill="${lit('#2a2420')}" opacity=".85"/>`);
      s.push(`<path d="M1049 140 C1020 128 990 100 976 70 C1004 84 1030 96 1049 112 C1068 96 1094 84 1122 70 C1108 100 1078 128 1049 140Z" fill="${lit('#e6d2a0')}" opacity=".9"/><path d="M1049 140 L1049 80 M1049 112 C1030 104 1010 90 996 78 M1049 112 C1068 104 1088 90 1102 78" stroke="${lit('#2a2420')}" stroke-width="1.4" fill="none"/><circle cx="1049" cy="74" r="6" fill="none" stroke="${lit('#e6d2a0')}" stroke-width="2"/>`);
      s.push(`<text x="1049" y="186" text-anchor="middle" class="rm-t rm-t-tag" fill="${lit('#5a4632')}">天翼紋 拓本</text>`);
      s.push(`<rect x="930" y="210" width="240" height="310" fill="${wood}"/><rect x="940" y="220" width="220" height="290" fill="${lit('#e9dcc0')}" opacity=".4"/>`);
      [300, 400].forEach(y => s.push(`<rect x="940" y="${y}" width="220" height="6" fill="${wood}"/>`));
      s.push(`<path d="M960 300 Q950 262 974 244 L994 244 Q1010 262 1000 300Z" fill="${lit('#b9774a')}"/><path d="M968 266 h24" stroke="${lit('#7a4a2a')}" stroke-width="2"/><rect x="1030" y="276" width="110" height="24" fill="${lit('#c8b28a')}"/><path d="M1044 276 l12 -18 l16 18" fill="${lit('#a99268')}"/>`);
      // 蒸気機関の模型
      s.push(`<rect x="960" y="372" width="70" height="28" rx="4" fill="${lit('#2a2a30')}"/><rect x="1010" y="356" width="12" height="18" fill="${lit('#2a2a30')}"/><circle cx="972" cy="400" r="6" fill="${lit('#b08a4a')}"/><circle cx="1000" cy="400" r="6" fill="${lit('#b08a4a')}"/><rect x="1052" y="356" width="80" height="44" fill="${lit('#d9c4a0')}"/><path d="M1060 380 q20 -12 40 0 t24 0" stroke="${lit('#7a5a3a')}" stroke-width="2" fill="none"/>`);
      s.push(`<path d="M960 500 l20 -54 l20 54Z" fill="${lit('#9a8a6a')}"/><rect x="1040" y="460" width="16" height="40" fill="${lit('#b08a4a')}"/><rect x="1070" y="470" width="70" height="30" rx="4" fill="${lit('#7a5a3a')}"/>`);
      s.push(`<rect x="940" y="220" width="220" height="290" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35"/>`);
      break;
    }
    case 'chiriHome': {
      // 氷の棚の小さな氷彫刻と、雪犬の毛でつくった毛布
      s.push(`<rect x="930" y="128" width="240" height="8" fill="#ffffff" opacity=".7"/>`);
      [[960, 30], [1010, 44], [1070, 26], [1130, 36]].forEach(([x, h]) => s.push(`<path d="M${x - 10} 128 L${x - 4} ${128 - h * .6} L${x} ${128 - h} L${x + 4} ${128 - h * .6} L${x + 10} 128Z" fill="url(#rm-icein)" stroke="#ffffff" stroke-width="1"/>`));
      s.push(`<rect x="930" y="250" width="240" height="8" fill="#ffffff" opacity=".7"/><rect x="944" y="214" width="70" height="36" rx="8" fill="${lit('#f4f0e8')}"/><rect x="944" y="226" width="70" height="4" fill="${lit('#c9b8a0')}" opacity=".6"/><rect x="1024" y="222" width="60" height="28" rx="8" fill="${lit('#ece4d6')}"/>`);
      break;
    }
    case 'salon': {
      // サンルド：役割の仮面の陳列ケース、市場の流れを映す壁の表示、チップと札
      const goldC = lit('#c9a24a'), black = lit('#1e1e22');
      // 市場の表示（価値を流し続ける）
      s.push(`<rect x="930" y="56" width="240" height="96" rx="3" fill="#121216" stroke="${goldC}" stroke-width="2"/>`);
      s.push(`<text x="942" y="74" class="rm-t rm-t-mono" fill="#e0b23a">VALUE FLOW ・ LARWOT</text>`);
      let pts = '', pts2 = '';
      const rr = tdRand('flow' + tdYmd(now));
      for(let i = 0; i <= 22; i++){ const x = 940 + i * 10; pts += `${x},${(118 - rr() * 30).toFixed(0)} `; pts2 += `${x},${(130 - rr() * 22).toFixed(0)} `; }
      s.push(`<polyline points="${pts}" fill="none" stroke="#e0b23a" stroke-width="1.6"/><polyline points="${pts2}" fill="none" stroke="#e8ecf2" stroke-width="1.4" opacity=".85"/>`);
      s.push(`<g clip-path="url(#rm-flowclip)"><text x="1170" y="146" class="rm-t rm-t-ticker-sm" fill="#e8ecf2">黄金 ▲0.42　白金 ▼0.08　信用指数 102.6　契約流量 ▲1.3　競売 ヴォルグレン 開場</text></g>`);
      // 仮面の陳列ケース（黄金・白金・天秤の黒）
      s.push(`<rect x="930" y="180" width="240" height="180" fill="${black}"/><rect x="938" y="188" width="224" height="164" fill="${lit('#2a2a30')}"/><rect x="938" y="188" width="224" height="164" fill="#ffffff" opacity=".05"/>`);
      [['#d4af37', 980], ['#2a2a2e', 1050], ['#e5e4e2', 1120]].forEach(([c, x], k) => {
        const y = 240;
        s.push(`<rect x="${x - 3}" y="${y + 50}" width="6" height="40" fill="${goldC}"/><rect x="${x - 16}" y="${y + 88}" width="32" height="6" fill="${goldC}"/>`);
        s.push(`<path d="M${x - 26} ${y} Q${x} ${y - 26} ${x + 26} ${y} Q${x + 26} ${y + 44} ${x} ${y + 60} Q${x - 26} ${y + 44} ${x - 26} ${y}Z" fill="${lit(c)}" stroke="${k === 1 ? goldC : tdMix(lit(c), '#000', .25)}" stroke-width="2"/>`);
        s.push(`<ellipse cx="${x - 10}" cy="${y + 16}" rx="7" ry="4" fill="${tdMix(lit(c), '#000', .6)}"/><ellipse cx="${x + 10}" cy="${y + 16}" rx="7" ry="4" fill="${tdMix(lit(c), '#000', .6)}"/>`);
        if(k === 0) s.push(`<path d="M${x - 26} ${y} l-10 -16 l14 6Z M${x + 26} ${y} l10 -16 l-14 6Z" fill="${lit(c)}"/>`);          // 道化師の黄金
        if(k === 2) s.push(`<path d="M${x - 14} ${y + 34} q14 8 28 0" stroke="${tdMix(lit(c), '#000', .4)}" stroke-width="1.5" fill="none"/>`); // 魔術師の白金
        if(k === 1) s.push(`<line x1="${x - 12}" y1="${y + 36}" x2="${x + 12}" y2="${y + 36}" stroke="${goldC}" stroke-width="1.2"/>`);       // 天秤の黒
      });
      // 下の飾り棚
      s.push(`<rect x="930" y="380" width="240" height="140" fill="${lit('#f4ecd8')}" stroke="${goldC}" stroke-width="3"/><rect x="930" y="380" width="240" height="8" fill="${goldC}"/><rect x="944" y="400" width="104" height="104" fill="none" stroke="${goldC}" stroke-width="1.5"/><rect x="1052" y="400" width="104" height="104" fill="none" stroke="${goldC}" stroke-width="1.5"/><circle cx="1050" cy="452" r="4" fill="${goldC}"/>`);
      break;
    }
    case 'atelier': {
      // オルガロン：アップライトピアノ、立てかけたチェロ、壁のトランペット
      const piano = lit('#2a1a1a'), ivory = lit('#f6efe0');
      s.push(`<g transform="translate(14 0)"><rect x="960" y="300" width="210" height="220" rx="4" fill="${piano}"/><rect x="968" y="308" width="194" height="90" fill="${lit('#3a2422')}"/><rect x="954" y="398" width="222" height="16" fill="${piano}"/>`);
      for(let k = 0; k < 15; k++) s.push(`<rect x="${960 + k * 14}" y="414" width="13" height="18" fill="${ivory}"/>`);
      for(let k = 0; k < 15; k++) if([0, 1, 3, 4, 5].includes(k % 7)) s.push(`<rect x="${970 + k * 14}" y="414" width="7" height="11" fill="${piano}"/>`);
      s.push(`<rect x="970" y="440" width="190" height="72" fill="${lit('#3a2422')}"/><rect x="1000" y="520" width="8" height="8" fill="${lit('#c9a24a')}"/><rect x="1120" y="520" width="8" height="8" fill="${lit('#c9a24a')}"/></g>`);
      // ピアノの上の楽譜立てと花瓶
      s.push(`<rect x="1010" y="270" width="80" height="30" rx="2" fill="${lit('#fbf7ef')}" transform="rotate(-4 1050 285)"/><path d="M1130 300 L1150 300 L1146 276 L1134 276Z" fill="${lit('#2e7de3')}"/><circle cx="1140" cy="268" r="8" fill="${lit('#e3462e')}"/>`);
      // チェロ
      const wood = lit('#a0522d'), woodD = lit('#6a3418');
      s.push(`<g transform="translate(46 30) scale(.88) rotate(-6 925 520)"><path d="M925 520 C890 520 885 490 900 470 C885 455 890 430 910 422 C900 410 905 395 925 392 C945 395 950 410 940 422 C960 430 965 455 950 470 C965 490 960 520 925 520Z" fill="${wood}" stroke="${woodD}" stroke-width="2"/><path d="M913 450 q-4 10 0 20 M937 450 q4 10 0 20" stroke="${woodD}" stroke-width="2" fill="none"/><rect x="922" y="300" width="6" height="96" fill="${woodD}"/><path d="M925 300 q10 -6 6 -16 q-8 -4 -10 6" fill="${woodD}"/><line x1="923" y1="300" x2="923" y2="500" stroke="${lit('#e8e0d0')}" stroke-width=".6"/><line x1="927" y1="300" x2="927" y2="500" stroke="${lit('#e8e0d0')}" stroke-width=".6"/><rect x="914" y="486" width="22" height="5" fill="${woodD}"/></g>`);
      // 壁のトランペット
      const brass = lit('#d6a93a');
      s.push(`<g transform="translate(1000 170) rotate(-8)"><rect x="0" y="0" width="110" height="7" rx="3" fill="${brass}"/><path d="M110 -12 L150 -26 L150 32 L110 18Z" fill="${brass}"/><rect x="30" y="-14" width="6" height="14" fill="${brass}"/><rect x="44" y="-14" width="6" height="14" fill="${brass}"/><rect x="58" y="-14" width="6" height="14" fill="${brass}"/><path d="M10 7 q30 22 70 0" stroke="${brass}" stroke-width="5" fill="none"/></g>`);
      // 額の絵
      s.push(`<rect x="940" y="70" width="80" height="70" fill="${lit('#fbf7ef')}" stroke="${lit('#c9a24a')}" stroke-width="4"/><circle cx="970" cy="98" r="16" fill="${lit('#2e7de3')}" opacity=".85"/><path d="M944 136 l22 -26 l16 14 l14 -10 l20 22Z" fill="${lit('#3ab36a')}"/>`);
      s.push(`<rect x="1050" y="64" width="110" height="80" fill="${lit('#2b2b33')}" stroke="${lit('#c9a24a')}" stroke-width="4"/><path d="M1060 132 q24 -52 92 -54" stroke="${lit('#e3c22e')}" stroke-width="5" fill="none"/><circle cx="1130" cy="100" r="10" fill="${lit('#e3462e')}"/>`);
      break;
    }
    case 'hubertHome': {
      // 猫と共存する住宅設計：壁を渡る猫の通り道、壁の猫トンネル、キャットタワー、白い造り付け家具
      const white = lit('#f6f8fa'), edge = lit('#d8e0e6'), wood = lit('#d9c7a6');
      const c1 = lit('#8a8f98'), c2 = lit('#efe4d2'), c3 = lit('#c27a3a'), c4 = lit('#2e2f36');
      // 造り付けの白い収納（角を丸めた効率的な形）
      s.push(`<rect x="930" y="380" width="250" height="140" rx="18" fill="${white}" stroke="${edge}" stroke-width="2"/><rect x="944" y="396" width="104" height="110" rx="10" fill="${lit('#eef2f5')}"/><rect x="1062" y="396" width="104" height="110" rx="10" fill="${lit('#eef2f5')}"/><rect x="990" y="446" width="14" height="3" rx="1.5" fill="${edge}"/><rect x="1108" y="446" width="14" height="3" rx="1.5" fill="${edge}"/>`);
      // 収納の上で丸くなる猫
      s.push(`<ellipse cx="1010" cy="370" rx="34" ry="14" fill="${c2}"/><circle cx="984" cy="366" r="12" fill="${c2}"/><path d="M976 358 l3 -10 l6 8Z M987 356 l4 -9 l3 10Z" fill="${c2}"/><path d="M1042 374 q16 6 4 -10" stroke="${c2}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M978 368 q3 2 6 0" stroke="${lit('#8a7a6a')}" stroke-width="1.2" fill="none"/>`);
      // 壁に取り付けた階段状の足場
      [[1130, 330], [1080, 280], [1130, 230], [1080, 180], [1130, 130]].forEach(([x, y]) => s.push(`<rect x="${x}" y="${y}" width="56" height="10" rx="5" fill="${wood}"/><rect x="${x + 6}" y="${y + 10}" width="44" height="4" fill="#000" opacity=".08"/>`));
      // 足場の上の猫（しっぽが揺れる）
      s.push(`<path d="M1088 280 Q1084 246 1100 232 Q1118 246 1114 280Z" fill="${c3}"/><circle cx="1101" cy="226" r="12" fill="${c3}"/><path d="M1091 218 l2 -11 l7 7Z M1104 214 l7 -7 l2 11Z" fill="${c3}"/><circle cx="1097" cy="226" r="1.6" fill="#1a2233"/><circle cx="1106" cy="226" r="1.6" fill="#1a2233"/><path class="rm-tail" style="transform-origin:1114px 276px" d="M1114 276 q22 4 18 -26" stroke="${c3}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      // 壁の猫トンネルから顔を出す黒猫
      s.push(`<circle cx="960" cy="230" r="30" fill="${lit('#e3e9ee')}" stroke="${edge}" stroke-width="3"/><circle cx="960" cy="232" r="22" fill="${lit('#3a3d44')}"/><circle cx="960" cy="240" r="13" fill="${c4}"/><path d="M950 232 l2 -10 l6 7Z M963 229 l6 -7 l2 10Z" fill="${c4}"/><circle cx="955" cy="240" r="2" fill="#e8d26a"/><circle cx="965" cy="240" r="2" fill="#e8d26a"/>`);
      // 床：猫の食器と水
      s.push(`<ellipse cx="970" cy="560" rx="22" ry="7" fill="${lit('#7fb2d8')}"/><ellipse cx="970" cy="557" rx="16" ry="4" fill="${lit('#c27a3a')}"/><ellipse cx="1020" cy="560" rx="22" ry="7" fill="${lit('#7fb2d8')}"/><ellipse cx="1020" cy="557" rx="16" ry="4" fill="${lit('#bfe3f5')}"/>`);
      // 羽根と猫の紋（国のシンボル）
      s.push(`<circle cx="1040" cy="90" r="28" fill="${white}" stroke="${edge}" stroke-width="2"/><path d="M1032 108 C1026 90 1034 72 1048 66 C1050 80 1044 98 1032 108Z" fill="${lit('#b8c8d8')}"/><path d="M1032 108 L1046 70" stroke="${lit('#8aa0b8')}" stroke-width="1"/><path d="M1046 104 l2 -8 l4 5Z M1052 104 l3 -6 l2 7Z" fill="${lit('#6b6f78')}"/>`);
      break;
    }
    case 'workshop': {
      // 工匠の部屋：工具の壁、名前札、小さな引き出しの棚、振り子時計、修理中の機械
      const wood = lit('#6b4f33'), woodL = lit('#8a6a45'), brass = lit('#b08a4a'), paper = lit('#f1e6cc');
      const tag = (x, y, name) => `<line x1="${x}" y1="${y}" x2="${x + 6}" y2="${y + 12}" stroke="${lit('#7a6a50')}" stroke-width=".8"/><rect x="${x + 2}" y="${y + 12}" width="30" height="12" rx="2" fill="${paper}" transform="rotate(8 ${x + 2} ${y + 12})"/><text x="${x + 5}" y="${y + 21}" class="rm-t rm-t-tag" fill="${lit('#5a4632')}" transform="rotate(8 ${x + 2} ${y + 12})">${name}</text>`;
      // 有孔ボードと工具
      s.push(`<rect x="930" y="70" width="240" height="150" rx="3" fill="${lit('#c9b48e')}" stroke="${wood}" stroke-width="3"/>`);
      for(let x = 942; x < 1166; x += 14) for(let y = 82; y < 214; y += 14) s.push(`<circle cx="${x}" cy="${y}" r="1.4" fill="${lit('#8a7350')}"/>`);
      const tool = lit('#6b7078');
      s.push(`<path d="M950 90 l6 0 l0 70 l-6 0Z M946 84 l14 0 l-2 8 l-10 0Z" fill="${tool}"/><path d="M976 88 l10 0 l-2 60 l-6 0Z" fill="${brass}"/><rect x="976" y="148" width="10" height="26" rx="3" fill="${lit('#b2483a')}"/>`);
      s.push(`<path d="M1004 90 q12 -4 12 10 l-4 4 l0 64 l-8 0 l0 -64 l-4 -4 q-6 -12 4 -10Z" fill="${tool}"/>`);
      s.push(`<rect x="1034" y="96" width="70" height="8" fill="${brass}"/><rect x="1040" y="104" width="4" height="30" fill="${brass}"/><rect x="1094" y="104" width="4" height="22" fill="${brass}"/>`);
      s.push(`<circle cx="1135" cy="120" r="16" fill="none" stroke="${tool}" stroke-width="4"/><rect x="1131" y="136" width="8" height="40" fill="${tool}"/>`);
      s.push(tag(1100, 150, 'ヴェル'));
      // 小さな引き出しがたくさんある部品棚
      s.push(`<rect x="930" y="250" width="120" height="270" fill="${wood}"/>`);
      for(let r2 = 0; r2 < 8; r2++) for(let c = 0; c < 3; c++){ const x = 936 + c * 38, y = 256 + r2 * 32; s.push(`<rect x="${x}" y="${y}" width="34" height="28" fill="${woodL}"/><circle cx="${x + 17}" cy="${y + 16}" r="2.4" fill="${brass}"/><rect x="${x + 9}" y="${y + 4}" width="16" height="6" fill="${paper}" opacity=".85"/>`); }
      s.push(tag(1040, 250, 'ノト'));
      // 振り子時計
      const face = (x, y, rr) => { const hr = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * 6.283, mn = now.getMinutes() / 60 * 6.283; return `<circle cx="${x}" cy="${y}" r="${rr}" fill="${lit('#f6efe0')}" stroke="${brass}" stroke-width="3"/><line x1="${x}" y1="${y}" x2="${(x + Math.sin(hr) * rr * .5).toFixed(1)}" y2="${(y - Math.cos(hr) * rr * .5).toFixed(1)}" stroke="#1a2233" stroke-width="2.2"/><line x1="${x}" y1="${y}" x2="${(x + Math.sin(mn) * rr * .75).toFixed(1)}" y2="${(y - Math.cos(mn) * rr * .75).toFixed(1)}" stroke="#1a2233" stroke-width="1.5"/>`; };
      s.push(`<path d="M1070 250 L1160 250 L1160 520 L1070 520Z" fill="${wood}"/><path d="M1064 250 L1115 222 L1166 250Z" fill="${woodL}"/>${face(1115, 290, 28)}<rect x="1084" y="330" width="62" height="170" rx="3" fill="${lit('#3a2a1c')}" opacity=".55"/><g class="rm-pendulum" style="transform-origin:1115px 330px"><line x1="1115" y1="330" x2="1115" y2="470" stroke="${brass}" stroke-width="2"/><circle cx="1115" cy="478" r="13" fill="${brass}"/></g>`);
      s.push(tag(1150, 300, 'オルン'));
      break;
    }
    case 'dining': {
      // 台所：調味料と発酵の瓶、吊るした食材、野菜の箱、「共に暖かく」の札
      const wood = lit('#7a5434'), tile = lit('#e9dcc4');
      s.push(`<rect x="930" y="380" width="250" height="140" fill="${lit('#e9d9bd')}" stroke="${wood}" stroke-width="3"/><rect x="930" y="372" width="250" height="10" fill="${wood}"/><rect x="940" y="400" width="110" height="100" fill="${lit('#e2d0b0')}" stroke="${wood}"/><rect x="1060" y="400" width="110" height="100" fill="${lit('#e2d0b0')}" stroke="${wood}"/><circle cx="1040" cy="450" r="3" fill="${wood}"/><circle cx="1070" cy="450" r="3" fill="${wood}"/>`);
      s.push(`<path d="M1000 372 L1064 372 L1058 338 L1006 338Z" fill="${lit('#55595f')}"/><rect x="996" y="334" width="72" height="6" rx="3" fill="${lit('#6a6e74')}"/><path d="M1016 330 q5 -14 0 -26 M1040 330 q5 -14 0 -26" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".5" class="rm-steam"/>`);
      s.push(`<rect x="1110" y="346" width="40" height="26" fill="${lit('#c9b48e')}"/><path d="M1114 346 l6 -14 l6 14 M1128 346 l6 -12 l6 12" fill="${lit('#7a9a3a')}"/>`);
      s.push(`<rect x="930" y="240" width="250" height="8" fill="${wood}"/><rect x="930" y="150" width="250" height="8" fill="${wood}"/>`);
      for(let k = 0; k < 6; k++){ const x = 940 + k * 40, h = 46 + r() * 30, col = ['#c97b3a', '#9fb34a', '#d6b25a', '#b2483a', '#7a8f3a', '#e0a050'][k]; s.push(`<rect x="${x}" y="${240 - h}" width="30" height="${h}" rx="7" fill="${lit('#e9e4d8')}" opacity=".88"/><rect x="${x + 3}" y="${240 - h * .7}" width="24" height="${h * .7 - 3}" rx="5" fill="${lit(col)}"/><rect x="${x + 4}" y="${240 - h - 7}" width="22" height="8" fill="${wood}"/><rect x="${x + 6}" y="${240 - h * .45}" width="18" height="8" fill="${lit('#f6efe0')}" opacity=".9"/>`); }
      for(let k = 0; k < 9; k++){ const x = 940 + k * 27; s.push(`<rect x="${x}" y="${150 - 22}" width="14" height="22" rx="3" fill="${lit(['#b2483a', '#d6b25a', '#7a8f3a', '#8a5a3a', '#c97b3a'][k % 5])}"/>`); }
      for(let k = 0; k < 7; k++){ const x = 944 + k * 34, c = ['#c9a24a', '#b2483a', '#8a9a3a', '#e0c060', '#a05a3a', '#7a8a3a', '#d6b25a'][k]; s.push(`<line x1="${x}" y1="158" x2="${x}" y2="${170 + (k % 3) * 5}" stroke="${wood}"/><ellipse cx="${x}" cy="${186 + (k % 3) * 5}" rx="8" ry="${15 + (k % 2) * 5}" fill="${lit(c)}"/>`); }
      // 「共に暖かく」の札
      s.push(`<rect x="990" y="70" width="130" height="40" rx="4" fill="${lit('#8a5a3a')}"/><rect x="996" y="76" width="118" height="28" rx="2" fill="${lit('#f3e6c8')}"/><text x="1055" y="96" text-anchor="middle" class="rm-t rm-t-sign" fill="${lit('#7a3a2a')}">共に暖かく</text><line x1="1000" y1="70" x2="1020" y2="44" stroke="${wood}"/><line x1="1110" y1="70" x2="1090" y2="44" stroke="${wood}"/>`);
      // 床：野菜の箱と発酵の甕
      s.push(`<rect x="840" y="560" width="80" height="44" fill="${lit('#a8845a')}"/><path d="M846 560 q10 -16 20 0 q10 -16 20 0 q10 -16 20 0 q8 -12 12 0" fill="${lit('#6a9a3a')}"/><circle cx="870" cy="558" r="7" fill="${lit('#e3462e')}"/><circle cx="896" cy="560" r="6" fill="${lit('#e3a02e')}"/>`);
      s.push(`<path d="M780 604 Q768 572 786 560 L818 560 Q836 572 824 604Z" fill="${lit('#7a4a2a')}"/><rect x="786" y="552" width="32" height="8" rx="3" fill="${lit('#5a3a20')}"/>`);
      break;
    }
    case 'tokonoma': {
      // 床の間：龍の掛け軸と生け花
      s.push(`<rect x="920" y="40" width="250" height="480" fill="${dark(lit('#ece6d8'), .08)}"/><rect x="914" y="34" width="262" height="10" fill="${lit('#6e5238')}"/><rect x="914" y="36" width="10" height="484" fill="${lit('#6e5238')}"/>`);
      s.push(`<rect x="1008" y="70" width="70" height="6" fill="${lit('#5a4632')}"/><rect x="1012" y="76" width="62" height="300" fill="${lit('#efe6cf')}"/><rect x="1006" y="376" width="74" height="8" rx="3" fill="${lit('#5a4632')}"/>`);
      s.push(`<path d="M1043 110 C1018 140 1068 170 1043 205 S1016 260 1046 295 S1066 335 1038 360" stroke="${lit('#2b3240')}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="1043" cy="110" r="9" fill="${lit('#2b3240')}"/><circle cx="1048" cy="107" r="2" fill="${lit('#b71c1c')}"/>`);
      s.push(`<rect x="924" y="470" width="246" height="50" fill="${lit('#8a6a45')}"/><path d="M1110 470 L1140 470 L1136 440 L1114 440Z" fill="${lit('#3d4a5a')}"/><path d="M1125 440 c-8 -30 -20 -44 -34 -54 M1125 440 c4 -34 14 -50 26 -62 M1125 440 c0 -24 2 -40 -2 -60" stroke="${lit('#4f7a4a')}" stroke-width="3" fill="none"/><circle cx="1091" cy="386" r="5" fill="${lit('#e88aa8')}"/><circle cx="1151" cy="378" r="4" fill="${lit('#f0f0f0')}"/>`);
      break;
    }
    case 'server': {
      s.push(`<rect x="930" y="54" width="200" height="466" fill="${lit('#9aa6b5')}"/><rect x="938" y="62" width="184" height="450" fill="#141c2b"/>`);
      for(let y = 70; y < 506; y += 14){
        s.push(`<rect x="944" y="${y}" width="172" height="10" rx="1" fill="#22304a"/>`);
        for(let k = 0; k < 6; k++) s.push(`<circle cx="${954 + k * 8}" cy="${y + 5}" r="1.6" fill="${r() < .7 ? '#4FDAE0' : '#7cf0a0'}" class="${r() < .3 ? 'rm-twinkle' : ''}"/>`);
      }
      break;
    }
    case 'cats': {
      // キャットタワーと猫たち
      const c = lit('#c9b493'), p = lit('#e3d8c4'), cat1 = lit('#6b6f78'), cat2 = lit('#e8dcc8'), cat3 = lit('#c27a3a');
      s.push(`<rect x="996" y="150" width="14" height="370" fill="${c}"/><rect x="1086" y="300" width="14" height="220" fill="${c}"/><rect x="950" y="140" width="110" height="14" rx="5" fill="${p}"/><rect x="1040" y="290" width="110" height="14" rx="5" fill="${p}"/><rect x="940" y="420" width="90" height="14" rx="5" fill="${p}"/><rect x="930" y="506" width="230" height="16" rx="5" fill="${p}"/>`);
      s.push(`<ellipse cx="1092" cy="236" rx="40" ry="34" fill="${p}"/><ellipse cx="1092" cy="240" rx="26" ry="22" fill="${dark(p, .25)}"/>`);
      // 寝ている猫・座っている猫・のびている猫
      s.push(`<ellipse cx="1000" cy="130" rx="30" ry="13" fill="${cat2}"/><circle cx="976" cy="126" r="11" fill="${cat2}"/><path d="M968 118 l3 -9 l5 7Z M978 116 l4 -8 l3 9Z" fill="${cat2}"/><path d="M1028 134 q14 6 4 -8" stroke="${cat2}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      s.push(`<path d="M1080 290 Q1076 254 1092 240 Q1110 254 1106 290Z" fill="${cat3}"/><circle cx="1093" cy="234" r="12" fill="${cat3}"/><path d="M1083 226 l2 -11 l7 7Z M1096 222 l7 -7 l2 11Z" fill="${cat3}"/><circle cx="1089" cy="234" r="1.6" fill="#1a2233"/><circle cx="1098" cy="234" r="1.6" fill="#1a2233"/><path class="rm-tail" style="transform-origin:1106px 284px" d="M1106 284 q24 -4 20 -30" stroke="${cat3}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      s.push(`<path d="M960 520 Q980 498 1030 500 Q1070 502 1080 520Z" fill="${cat1}"/><circle cx="952" cy="510" r="11" fill="${cat1}"/><path d="M944 502 l2 -9 l6 6Z M954 499 l5 -7 l2 9Z" fill="${cat1}"/>`);
      break;
    }
    case 'greenery': {
      // 鉢植えと吊るした薬草、種子の器
      s.push(`<rect x="930" y="300" width="230" height="10" fill="${lit('#6a4e2f')}"/><rect x="930" y="200" width="230" height="10" fill="${lit('#6a4e2f')}"/>`);
      for(let k = 0; k < 4; k++){ const x = 944 + k * 54; s.push(`<path d="M${x} 300 L${x + 34} 300 L${x + 30} 276 L${x + 4} 276Z" fill="${lit('#8a5a3a')}"/><path d="M${x + 17} 276 c-12 -14 -18 -30 -12 -44 M${x + 17} 276 c10 -18 22 -24 30 -26 M${x + 17} 276 c0 -20 4 -34 8 -46" stroke="${lit('#3f8a4e')}" stroke-width="4" fill="none" stroke-linecap="round"/>`); }
      for(let k = 0; k < 5; k++){ const x = 946 + k * 44, h = 22 + (k % 3) * 6; s.push(`<rect x="${x}" y="${200 - h}" width="26" height="${h}" rx="5" fill="${lit('#e9e4d8')}" opacity=".85"/><rect x="${x + 3}" y="${200 - h * .6}" width="20" height="${h * .6 - 2}" rx="3" fill="${lit(['#c9a24a', '#8a5a3a', '#6a8a3a', '#b2483a', '#d6b25a'][k])}"/>`); }
      s.push(`<rect x="930" y="70" width="230" height="4" fill="${lit('#6a4e2f')}"/>`);
      for(let k = 0; k < 6; k++){ const x = 946 + k * 38; s.push(`<line x1="${x}" y1="74" x2="${x}" y2="96" stroke="${lit('#6a4e2f')}"/><path d="M${x - 10} 96 Q${x} 140 ${x + 10} 96Z" fill="${lit(k % 2 ? '#5f8a4a' : '#7a9a5a')}"/>`); }
      s.push(`<path d="M1060 520 L1150 520 L1140 440 L1070 440Z" fill="${lit('#8a5a3a')}"/>`);
      [[-60, 200], [-20, 260], [20, 230], [50, 190]].forEach(([dx, len]) => s.push(`<path d="M1105 440 q${dx} ${-len * .5} ${dx * 1.3} ${-len}" stroke="${lit('#2f6b3a')}" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="${1105 + dx * 1.3}" cy="${440 - len}" rx="22" ry="9" fill="${lit('#3f8a4e')}" transform="rotate(${dx} ${1105 + dx * 1.3} ${440 - len})"/>`));
      // ヒカリタケ
      [[960, 512], [980, 504], [1000, 514], [1022, 506]].forEach(([x, y], i) => s.push(`<rect x="${x - 2}" y="${y}" width="4" height="${14 - i}" fill="${lit('#d8e8d0')}"/><ellipse cx="${x}" cy="${y}" rx="8" ry="4.5" fill="${tdMix(lit('#b9d8c8'), '#9dffd8', Math.max(.15, 1 - L / .5))}"/>`));
      break;
    }
    case 'clockwall': {
      const brass = lit('#b08a4a'), wood = lit('#6b4f33');
      const face = (x, y, rr, c) => { const hr = (now.getHours() % 12) / 12 * 6.283 + rr, mn = now.getMinutes() / 60 * 6.283; return `<circle cx="${x}" cy="${y}" r="${rr}" fill="${lit('#f6efe0')}" stroke="${c}" stroke-width="${Math.max(2, rr / 8)}"/><line x1="${x}" y1="${y}" x2="${(x + Math.sin(hr) * rr * .5).toFixed(1)}" y2="${(y - Math.cos(hr) * rr * .5).toFixed(1)}" stroke="#1a2233" stroke-width="2"/><line x1="${x}" y1="${y}" x2="${(x + Math.sin(mn) * rr * .75).toFixed(1)}" y2="${(y - Math.cos(mn) * rr * .75).toFixed(1)}" stroke="#1a2233" stroke-width="1.4"/>`; };
      [[960, 90, 24, brass], [1030, 70, 16, wood], [1100, 110, 30, brass], [990, 180, 18, wood], [1060, 200, 22, brass], [1140, 210, 14, wood], [950, 260, 14, brass]].forEach(([x, y, rr, c]) => s.push(face(x, y, rr, c)));
      // 振り子時計
      s.push(`<rect x="1060" y="270" width="80" height="250" rx="6" fill="${wood}"/><circle cx="1100" cy="310" r="26" fill="${lit('#f6efe0')}"/>${face(1100, 310, 24, brass)}<g class="rm-pendulum" style="transform-origin:1100px 344px"><line x1="1100" y1="344" x2="1100" y2="470" stroke="${brass}" stroke-width="2"/><circle cx="1100" cy="476" r="12" fill="${brass}"/></g>`);
      s.push(`<rect x="930" y="330" width="110" height="190" fill="${lit('#e4dccb')}" stroke="${wood}" stroke-width="3"/>`);
      for(let k = 0; k < 4; k++) s.push(`<circle cx="${950 + k * 24}" cy="360" r="8" fill="none" stroke="${brass}" stroke-width="2.5"/><rect x="${942 + k * 24}" y="400" width="14" height="40" fill="${lit(['#6b7078', '#b08a4a', '#8a6a45', '#6b7078'][k])}"/>`);
      break;
    }
    case 'meatrack': {
      // 干し肉の竿。ほかには何もない
      const pole = lit('#3c4148');
      s.push(`<rect x="930" y="120" width="230" height="8" fill="${pole}"/><rect x="940" y="128" width="6" height="392" fill="${pole}"/><rect x="1144" y="128" width="6" height="392" fill="${pole}"/>`);
      for(let k = 0; k < 7; k++){
        const x = 966 + k * 26, h = 70 + r() * 70;
        s.push(`<path d="M${x} 128 l0 10" stroke="${lit('#8a8f96')}" stroke-width="2"/><path d="M${x - 9} 138 Q${x - 12} ${138 + h * .6} ${x - 4} ${138 + h} L${x + 6} ${138 + h} Q${x + 12} ${138 + h * .5} ${x + 9} 138Z" fill="${lit(r() < .5 ? '#6a2a24' : '#7a3a2a')}"/><path d="M${x - 2} 150 L${x} ${130 + h}" stroke="${lit('#e8d0c0')}" stroke-width="1" opacity=".35"/>`);
      }
      s.push(`<rect x="950" y="470" width="80" height="50" fill="${lit('#5c5348')}"/><path d="M950 470 L1030 520 M1030 470 L950 520" stroke="${dark(lit('#5c5348'), .3)}" stroke-width="3"/>`);
      break;
    }
    case 'hotelbed': {
      // 乱れたままのベッド、床に散らかった物、動き続ける掃除ロボット
      const sheet = lit('#efe2ea'), frameC = lit('#6a4a5a');
      s.push(`<rect x="900" y="300" width="20" height="220" fill="${frameC}"/><rect x="900" y="300" width="300" height="20" fill="${frameC}" opacity=".0"/>`);
      s.push(`<rect x="900" y="420" width="300" height="70" fill="${frameC}"/><path d="M920 420 Q980 380 1060 404 Q1140 380 1200 410 L1200 440 L920 440Z" fill="${sheet}"/><path d="M960 432 Q1020 396 1080 430 Q1130 450 1180 420" stroke="${dark(sheet, .15)}" stroke-width="3" fill="none"/><ellipse cx="960" cy="408" rx="34" ry="14" fill="${lit('#f6eef2')}" transform="rotate(-12 960 408)"/><path d="M1100 440 Q1140 470 1110 520 L1060 520 Q1080 480 1060 440Z" fill="${sheet}"/>`);
      s.push(`<rect x="1120" y="250" width="70" height="40" rx="3" fill="${lit('#2a1a26')}"/><rect x="1124" y="254" width="62" height="32" fill="#ff3fb0" opacity=".35"/>`);
      break;
    }
    case 'atelier_old': {
      s.push(`<rect x="940" y="70" width="90" height="110" fill="${lit('#fbf7ef')}" stroke="${lit('#c9a24a')}" stroke-width="5"/><circle cx="985" cy="115" r="22" fill="${lit('#2e7de3')}" opacity=".8"/><path d="M944 176 l26 -32 l18 18 l14 -10 l24 24Z" fill="${lit('#3ab36a')}"/>`);
      s.push(`<rect x="1050" y="90" width="100" height="70" fill="${lit('#2b2b33')}" stroke="${lit('#c9a24a')}" stroke-width="4"/><path d="M1060 150 q24 -40 80 -46" stroke="${lit('#e3c22e')}" stroke-width="4" fill="none"/>`);
      const w = lit('#8a6a45');
      s.push(`<line x1="980" y1="520" x2="1030" y2="250" stroke="${w}" stroke-width="7"/><line x1="1120" y1="520" x2="1070" y2="250" stroke="${w}" stroke-width="7"/><line x1="1050" y1="250" x2="1056" y2="522" stroke="${w}" stroke-width="5"/>`);
      s.push(`<rect x="980" y="270" width="150" height="170" fill="${lit('#fbf7ef')}" stroke="${lit('#d8cdb8')}" stroke-width="2"/><path d="M994 400 q36 -80 76 -44 q24 16 50 -30" stroke="${lit('#e3462e')}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="1100" cy="310" r="16" fill="${lit('#e3c22e')}" opacity=".8"/><rect x="984" y="442" width="142" height="9" fill="${w}"/>`);
      s.push(`<rect x="1150" y="460" width="40" height="60" fill="${lit('#e6ddcf')}"/>`);
      ['#e3462e', '#2e7de3', '#e3c22e', '#3ab36a'].forEach((c, k) => s.push(`<rect x="${1154 + k * 9}" y="${430 - k * 4}" width="5" height="${34 + k * 4}" rx="2" fill="${lit(c)}"/>`));
      break;
    }
    case 'cabinet': {
      // 発掘品の陳列棚（ガラス）
      const wood = lit('#6b4f33');
      s.push(`<rect x="930" y="90" width="230" height="430" fill="${wood}"/><rect x="940" y="100" width="210" height="400" fill="${lit('#e9dcc0')}" opacity=".45"/>`);
      [200, 300, 400].forEach(y => s.push(`<rect x="940" y="${y}" width="210" height="6" fill="${wood}"/>`));
      s.push(`<path d="M960 200 Q950 160 975 140 L995 140 Q1010 160 1000 200Z" fill="${lit('#b9774a')}"/><rect x="1030" y="176" width="100" height="24" fill="${lit('#c8b28a')}"/><path d="M1040 176 l14 -20 l18 20" fill="${lit('#a99268')}"/>`);
      s.push(`<circle cx="990" cy="270" r="22" fill="none" stroke="${lit('#9a7a4a')}" stroke-width="6"/><rect x="1050" y="250" width="80" height="50" fill="${lit('#d9c4a0')}"/><path d="M1060 270 q20 -12 40 0 t20 0" stroke="${lit('#7a5a3a')}" stroke-width="2" fill="none"/>`);
      s.push(`<path d="M960 400 l20 -50 l20 50Z" fill="${lit('#9a8a6a')}"/><rect x="1040" y="360" width="16" height="40" fill="${lit('#b08a4a')}"/><rect x="1070" y="370" width="60" height="30" rx="4" fill="${lit('#7a5a3a')}"/>`);
      s.push(`<rect x="940" y="100" width="210" height="400" fill="none" stroke="#ffffff" stroke-width="2" opacity=".35"/>`);
      break;
    }
    case 'masks': {
      // 役割を示す仮面（黄金・白金・天秤の黒）と、金の調度
      [['#d4af37', 960, 110], ['#e5e4e2', 1050, 110], ['#2a2a2e', 1140, 110], ['#d4af37', 1005, 230], ['#e5e4e2', 1095, 230]].forEach(([c, x, y]) => {
        s.push(`<path d="M${x - 30} ${y} Q${x} ${y - 30} ${x + 30} ${y} Q${x + 30} ${y + 52} ${x} ${y + 72} Q${x - 30} ${y + 52} ${x - 30} ${y}Z" fill="${lit(c)}" stroke="${dark(lit(c), .25)}" stroke-width="2"/>`);
        s.push(`<ellipse cx="${x - 12}" cy="${y + 20}" rx="8" ry="4.5" fill="${dark(lit(c), .6)}"/><ellipse cx="${x + 12}" cy="${y + 20}" rx="8" ry="4.5" fill="${dark(lit(c), .6)}"/>`);
      });
      s.push(`<rect x="940" y="420" width="220" height="100" fill="${lit('#f4ecd8')}" stroke="${lit('#c6a24a')}" stroke-width="4"/><rect x="940" y="420" width="220" height="10" fill="${lit('#c6a24a')}"/><circle cx="1050" cy="470" r="14" fill="none" stroke="${lit('#c6a24a')}" stroke-width="3"/>`);
      break;
    }
    case 'terrarium': {
      const glass = lit('#bfe3da');
      [[930, 80, 230, 120], [930, 220, 110, 130], [1050, 220, 110, 130], [930, 370, 230, 150]].forEach(([x, y, w, h], k) => {
        s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${glass}" opacity=".5" stroke="${lit('#e3f2ee')}" stroke-width="3"/>`);
        for(let i = 0; i < 4; i++) s.push(`<path d="M${x + 20 + i * w / 4} ${y + h} q${(r() - .5) * 20} ${-h * .4} 0 ${-h * .7}" stroke="${lit(k === 1 ? '#7a9a3a' : '#3f8a5e')}" stroke-width="4" fill="none"/>`);
        s.push(`<rect x="${x}" y="${y + h - 10}" width="${w}" height="10" fill="${lit(k === 3 ? '#5aa3a0' : '#8a6a45')}" opacity=".8"/>`);
      });
      s.push(`<ellipse class="rm-swim" cx="1040" cy="450" rx="12" ry="6" fill="${lit('#e88f5a')}"/><ellipse class="rm-swim" style="animation-delay:-3s" cx="1000" cy="480" rx="8" ry="4" fill="${lit('#5aa3e8')}"/>`);
      s.push(`<path d="M960 330 q10 -8 22 -2 q8 4 16 0" stroke="${lit('#6a8a3a')}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="1000" cy="326" r="3" fill="${lit('#2a3a2a')}"/>`);
      s.push(`<path d="M1080 330 l10 -16 l10 16Z" fill="${lit('#c9a24a')}"/>`);
      break;
    }
    case 'kitchen': {
      const wood = lit('#7a5434');
      s.push(`<rect x="920" y="380" width="260" height="140" fill="${lit('#e9d9bd')}" stroke="${wood}" stroke-width="3"/><rect x="920" y="372" width="260" height="10" fill="${wood}"/><rect x="930" y="400" width="110" height="100" fill="${dark(lit('#e9d9bd'), .06)}" stroke="${wood}"/><rect x="1060" y="400" width="110" height="100" fill="${dark(lit('#e9d9bd'), .06)}" stroke="${wood}"/>`);
      s.push(`<rect x="920" y="220" width="260" height="8" fill="${wood}"/><rect x="920" y="120" width="260" height="8" fill="${wood}"/>`);
      for(let k = 0; k < 6; k++){ const x = 930 + k * 42, h = 50 + r() * 30, col = ['#c97b3a', '#9fb34a', '#d6b25a', '#b2483a', '#7a8f3a', '#e0a050'][k]; s.push(`<rect x="${x}" y="${220 - h}" width="32" height="${h}" rx="7" fill="${lit('#e9e4d8')}" opacity=".85"/><rect x="${x + 3}" y="${220 - h * .7}" width="26" height="${h * .7 - 3}" rx="5" fill="${lit(col)}"/><rect x="${x + 4}" y="${220 - h - 7}" width="24" height="8" fill="${wood}"/>`); }
      for(let k = 0; k < 7; k++){ const x = 940 + k * 34, c = ['#c9a24a', '#b2483a', '#8a9a3a', '#e0c060', '#a05a3a', '#7a8a3a', '#d6b25a'][k]; s.push(`<line x1="${x}" y1="128" x2="${x}" y2="${142 + (k % 3) * 6}" stroke="${wood}"/><ellipse cx="${x}" cy="${160 + (k % 3) * 6}" rx="8" ry="${16 + (k % 2) * 6}" fill="${lit(c)}"/>`); }
      s.push(`<path d="M1000 372 L1060 372 L1054 340 L1006 340Z" fill="${lit('#55595f')}"/><path d="M1016 336 q5 -14 0 -26 M1040 336 q5 -14 0 -26" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".5" class="rm-steam"/>`);
      break;
    }
    case 'icecorner': {
      // 氷彫刻と、氷のブロックの棚
      const ice = lit('#f4fbff');
      s.push(`<rect x="940" y="420" width="220" height="100" fill="${lit('#cfe1ec')}"/><rect x="940" y="420" width="220" height="2" fill="#ffffff" opacity=".6"/>`);
      s.push(`<path d="M990 420 L1000 330 L1030 290 L1050 250 L1060 300 L1090 330 L1100 420Z" fill="${ice}" opacity=".9" stroke="#ffffff" stroke-width="2"/><path d="M1030 290 L1050 250 L1070 260 L1060 300Z" fill="${lit('#dcefff')}"/>`);
      s.push(`<path d="M1120 420 L1124 370 Q1140 330 1156 370 L1160 420Z" fill="${lit('#eaf6fd')}" opacity=".9" stroke="#ffffff"/>`);
      s.push(`<rect x="940" y="120" width="220" height="6" fill="#ffffff" opacity=".6"/><path d="M960 120 l10 -30 l10 30Z M1010 120 l6 -20 l6 20Z" fill="${ice}" opacity=".85"/>`);
      break;
    }
    case 'waterpipe': {
      // ルハータの高床の家：透明な送水パイプと、貝の飾り
      s.push(`<rect x="0" y="12" width="1200" height="20" rx="10" fill="#cfefff" opacity=".35" stroke="#ffffff" stroke-opacity=".6"/><rect x="0" y="16" width="1200" height="12" rx="6" fill="url(#rm-water)" class="rm-waterflow"/>`);
      s.push(`<rect x="1150" y="12" width="20" height="508" rx="10" fill="#cfefff" opacity=".35" stroke="#ffffff" stroke-opacity=".6"/><rect x="1154" y="20" width="12" height="500" fill="#7fe8ff" opacity=".35" class="rm-bubble"/>`);
      for(let k = 0; k < 6; k++) s.push(`<circle class="rm-bubble" style="animation-delay:-${k * .9}s" cx="1160" cy="${480 - k * 70}" r="2.5" fill="#ffffff" opacity=".7"/>`);
      s.push(`<rect x="940" y="400" width="190" height="120" fill="${lit('#c9b08a')}" stroke="${lit('#2f5f78')}" stroke-width="3"/><rect x="940" y="392" width="190" height="10" fill="${lit('#2f5f78')}"/>`);
      s.push(`<path d="M960 392 Q974 360 1004 366 Q1024 372 1016 392Z" fill="${lit('#f0d6c0')}"/><path d="M1040 392 l8 -40 l8 22 l8 -30 l8 30 l8 -18 l6 36Z" fill="${lit('#e88a7a')}"/><path d="M1094 392 Q1086 368 1106 360 Q1124 368 1118 392Z" fill="${lit('#f4e2cc')}"/>`);
      s.push(`<path d="M940 90 Q1040 140 1130 90" stroke="${lit('#c9b08a')}" stroke-width="2" fill="none"/><path d="M960 100 L980 160 M1000 112 L1010 170 M1040 116 L1040 176 M1080 112 L1070 170 M1110 100 L1096 160 M950 140 Q1040 190 1120 140" stroke="${lit('#c9b08a')}" stroke-width="1.4" fill="none" opacity=".8"/>`);
      break;
    }
    case 'lounge': {
      // 多文化が混ざったソファと、空景ドリンク
      const sofa = lit('#9aa8c8');
      s.push(`<rect x="930" y="420" width="250" height="70" rx="14" fill="${sofa}"/><rect x="930" y="380" width="250" height="56" rx="14" fill="${dark(sofa, .08)}"/><rect x="936" y="486" width="10" height="30" fill="${dark(sofa, .3)}"/><rect x="1164" y="486" width="10" height="30" fill="${dark(sofa, .3)}"/>`);
      [['#e3462e', 960], ['#e3c22e', 1010], ['#3ab36a', 1060], ['#9b4ad6', 1110], ['#2e7de3', 1150]].forEach(([c, x], k) => s.push(`<rect x="${x - 20}" y="${386 + (k % 2) * 6}" width="40" height="36" rx="8" fill="${lit(c)}" transform="rotate(${(k - 2) * 6} ${x} 404)"/><path d="M${x - 14} ${398 + (k % 2) * 6} h28 M${x - 14} ${408 + (k % 2) * 6} h28" stroke="#ffffff" stroke-width="1.5" opacity=".5" transform="rotate(${(k - 2) * 6} ${x} 404)"/>`));
      s.push(`<rect x="950" y="150" width="200" height="120" rx="60" fill="none" stroke="${lit('#e0c21a')}" stroke-width="5" opacity=".7"/><circle cx="1050" cy="210" r="14" fill="${lit('#e0c21a')}" opacity=".6"/>`);
      break;
    }
    default: {
      s.push(`<path d="M1040 520 L1120 520 L1110 450 L1050 450Z" fill="${lit('#6b5a4a')}"/>`);
      [[-50, 180], [-10, 240], [30, 200]].forEach(([dx, len]) => s.push(`<path d="M1080 450 q${dx} ${-len * .5} ${dx * 1.3} ${-len}" stroke="${lit('#2f7550')}" stroke-width="5" fill="none"/><ellipse cx="${1080 + dx * 1.3}" cy="${450 - len}" rx="18" ry="8" fill="${lit('#3f8a5e')}"/>`));
    }
  }
  const shift = { tokonoma:28, hotelbed:30, kitchen:20 }[st.feature] || 0;
  return shift ? `<g transform="translate(${shift} 0)">${s.join('')}</g>` : s.join('');
}

/* ---------- 壁の小物（窓の左側） ---------- */
function tdWallProps(st, id, lit, dark, accent, L){
  const s = [];
  const has = p => st.props.includes(p);
  if(has('catwalk')){
    // 天井近くを渡る猫の通り道と、そこを歩く猫
    s.push(`<rect x="0" y="22" width="1200" height="9" rx="4" fill="${lit('#d9c7a6')}"/><rect x="0" y="31" width="1200" height="3" fill="#000" opacity=".06"/>`);
    for(let x = 60; x < 1200; x += 180) s.push(`<rect x="${x}" y="31" width="6" height="12" fill="${lit('#c9b493')}"/>`);
    const c = lit('#5a5d66');
    s.push(`<g class="rm-catwalk"><path d="M0 22 Q-2 6 14 4 L40 4 Q50 4 50 14 L50 22Z" fill="${c}"/><circle cx="54" cy="6" r="8" fill="${c}"/><path d="M50 0 l2 -8 l5 6Z M57 -1 l5 -6 l1 8Z" fill="${c}"/><path d="M0 10 q-16 -4 -18 -16" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="6" y="18" width="4" height="6" fill="${c}"/><rect x="38" y="18" width="4" height="6" fill="${c}"/></g>`);
  }
  if(has('smallclocks')){
    const brass = lit('#b08a4a');
    [[24, 100, 16], [22, 160, 11], [26, 210, 14]].forEach(([x, y, rr]) => {
      const mn = (now => now)(0);
      s.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="${lit('#f6efe0')}" stroke="${brass}" stroke-width="2.5"/><line x1="${x}" y1="${y}" x2="${x + rr * .4}" y2="${y - rr * .5}" stroke="#1a2233" stroke-width="1.5"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - rr * .75}" stroke="#1a2233" stroke-width="1.2"/>`);
    });
  }
  if(has('gear')){
    const c = lit('#9a7a4a');
    let teeth = '';
    for(let i = 0; i < 12; i++) teeth += `<rect x="-6" y="-48" width="12" height="12" fill="${c}" transform="rotate(${i * 30})"/>`;
    s.push(`<g transform="translate(22 120)"><g class="rm-gear">${teeth}<circle r="40" fill="${c}"/><circle r="13" fill="${lit('#dcc6a0')}"/></g></g>`);
  }
  if(has('map')) s.push(`<rect x="6" y="210" width="34" height="70" fill="${lit('#e8d6ac')}" stroke="${lit('#7a5a3a')}" stroke-width="2"/><path d="M10 230 q8 -6 14 2 t12 -4 M10 252 q10 6 16 -4" stroke="${lit('#7a5a3a')}" stroke-width="1.5" fill="none"/>`);
  if(has('datapanel')){
    s.push(`<rect x="6" y="70" width="36" height="300" rx="3" fill="#0f1a2c"/>`);
    for(let y = 84; y < 360; y += 12) s.push(`<rect x="12" y="${y}" width="${6 + (y * 7 % 22)}" height="3" fill="#4FDAE0" opacity="${(.3 + (y % 5) / 10).toFixed(2)}"/>`);
  }
  if(has('pipes')){
    const p = lit('#4f545b'), p2 = lit('#62686f');
    s.push(`<rect x="8" y="0" width="16" height="520" fill="${p}"/><rect x="30" y="0" width="10" height="520" fill="${p2}"/><rect x="4" y="120" width="24" height="10" fill="${dark(p, .3)}"/><rect x="26" y="300" width="18" height="10" fill="${dark(p, .3)}"/>`);
    s.push(`<rect x="0" y="18" width="1200" height="14" fill="${p}"/><circle cx="34" cy="200" r="14" fill="${lit('#e9e4d8')}" stroke="${dark(p, .3)}" stroke-width="3"/><line x1="34" y1="200" x2="41" y2="191" stroke="#b03a2e" stroke-width="2"/>`);
  }
  if(has('frames')) s.push(`<rect x="6" y="90" width="36" height="46" fill="${lit('#fbf7ef')}" stroke="${lit('#c9a24a')}" stroke-width="3"/><circle cx="24" cy="110" r="8" fill="${lit('#2e7de3')}" opacity=".8"/>`);
  if(has('feather')) s.push(`<path d="M24 110 C40 140 40 190 24 230 C16 190 16 140 24 110Z" fill="${lit('#f4f6f8')}" stroke="${lit('#b8c2cf')}" stroke-width="1.5"/><line x1="24" y1="112" x2="24" y2="250" stroke="${lit('#8a96a8')}" stroke-width="1.5"/>`);
  if(has('gauge')) s.push(`<circle cx="30" cy="120" r="22" fill="${lit('#ffffff')}" stroke="${lit('#b8c4d6')}" stroke-width="3"/><path d="M16 128 A16 16 0 0 1 44 128" stroke="${lit('#4f86c6')}" stroke-width="3" fill="none"/><line x1="30" y1="126" x2="39" y2="113" stroke="#1a2233" stroke-width="2"/>`);
  if(has('vines')){
    s.push(`<path d="M0 10 C40 40 20 90 60 120 S120 150 150 200" stroke="${lit('#3f7a46')}" stroke-width="5" fill="none"/>`);
    for(let i = 0; i < 9; i++){ const x = 10 + i * 16, y = 30 + i * 18; s.push(`<ellipse cx="${x}" cy="${y}" rx="8" ry="4" fill="${lit(i % 2 ? '#4f9a58' : '#3f8a4e')}" transform="rotate(${30 + i * 10} ${x} ${y})"/>`); }
  }
  return s.join('');
}

/* ---------- 机の上の小物 ---------- */
function tdDeskProps(st, id, lit, dark, accent, L){
  const s = [];
  const has = p => st.props.includes(p);
  if(has('tea')) s.push(`<path d="M560 438 L584 438 L581 452 L563 452Z" fill="${lit('#5a6a4a')}"/><path d="M566 432 q4 -8 0 -14 M576 432 q4 -8 0 -14" stroke="${lit('#d8dde4')}" stroke-width="1.5" fill="none" opacity=".6" class="rm-steam"/>`);
  if(has('scale')){
    const g = lit('#c6a24a');
    s.push(`<rect x="588" y="400" width="4" height="52" fill="${g}"/><rect x="570" y="448" width="40" height="5" fill="${g}"/><line x1="556" y1="404" x2="624" y2="404" stroke="${g}" stroke-width="3"/><path d="M546 430 L566 430 L556 404Z" fill="none" stroke="${g}" stroke-width="1.5"/><path d="M614 430 L634 430 L624 404Z" fill="none" stroke="${g}" stroke-width="1.5"/><path d="M544 430 q12 10 24 0" fill="${g}"/><path d="M612 430 q12 10 24 0" fill="${lit('#e5e4e2')}"/>`);
  }
  if(has('pot')){
    s.push(`<ellipse cx="580" cy="452" rx="62" ry="8" fill="${dark(lit('#3a3a3a'), .2)}"/><path d="M522 410 L638 410 L630 450 L530 450Z" fill="${lit('#3f4248')}"/><rect x="514" y="406" width="132" height="8" rx="4" fill="${lit('#55595f')}"/><rect x="504" y="416" width="16" height="6" rx="3" fill="${lit('#55595f')}"/><rect x="640" y="416" width="16" height="6" rx="3" fill="${lit('#55595f')}"/>`);
    s.push(`<path d="M550 400 q6 -14 0 -26 M580 398 q6 -16 0 -30 M610 400 q6 -14 0 -26" stroke="#ffffff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round" class="rm-steam"/><ellipse cx="410" cy="448" rx="22" ry="6" fill="${lit('#f3ead9')}"/>`);
  }
  if(has('ship')) s.push(`<path d="M548 440 L640 440 L628 452 L560 452Z" fill="${lit('#6b4f33')}"/><line x1="594" y1="440" x2="594" y2="386" stroke="${lit('#5a4632')}" stroke-width="2"/><path d="M596 390 L630 432 L596 432Z" fill="${lit('#f4f1e8')}"/><path d="M592 396 L566 432 L592 432Z" fill="${lit('#e8e2d2')}"/>`);
  if(has('notes')) s.push(`<rect x="540" y="412" width="100" height="40" rx="3" fill="${lit('#bfe3da')}" opacity=".6" stroke="${lit('#e3f2ee')}" stroke-width="2"/><path d="M552 452 q4 -20 0 -32 M600 452 q-4 -16 2 -28" stroke="${lit('#3f8a5e')}" stroke-width="3" fill="none"/><ellipse class="rm-swim" cx="584" cy="432" rx="6" ry="3.5" fill="${lit('#e8b45a')}"/>`);
  if(has('lens')) s.push(`<circle cx="580" cy="440" r="11" fill="none" stroke="${lit('#b08a4a')}" stroke-width="3"/><line x1="588" y1="448" x2="604" y2="452" stroke="${lit('#6b4f33')}" stroke-width="4"/><path d="M620 452 Q612 430 630 422 L646 422 Q660 430 652 452Z" fill="${lit('#b9774a')}"/>`);
  if(has('parts')){
    for(let k = 0; k < 4; k++) s.push(`<circle cx="${560 + k * 22}" cy="440" r="${5 + k % 2 * 3}" fill="none" stroke="${lit('#b08a4a')}" stroke-width="2"/>`);
    s.push(`<rect x="640" y="436" width="20" height="8" fill="${lit('#6b7078')}"/>`);
  }
  if(has('repair')){
    // 修理中の古い機械：ふたを開けて歯車が見えている。名前札つき
    const brass = lit('#b08a4a'), wood = lit('#6b4f33');
    s.push(`<rect x="540" y="400" width="110" height="48" rx="4" fill="${wood}"/><rect x="546" y="406" width="98" height="36" rx="2" fill="${lit('#3a2a1c')}"/><path d="M540 400 L560 370 L670 370 L650 400Z" fill="${lit('#8a6a45')}"/>`);
    [[566, 424, 12], [590, 418, 8], [612, 428, 10], [632, 420, 6]].forEach(([x, y, rr], k) => { let t = ''; for(let i = 0; i < 8; i++) t += `<rect x="${x - 1.5}" y="${y - rr - 3}" width="3" height="4" fill="${brass}" transform="rotate(${i * 45} ${x} ${y})"/>`; s.push(`<g class="${k % 2 ? 'rm-gear-rev' : 'rm-gear-sm'}" style="transform-origin:${x}px ${y}px">${t}<circle cx="${x}" cy="${y}" r="${rr}" fill="${brass}"/><circle cx="${x}" cy="${y}" r="${rr * .35}" fill="${lit('#3a2a1c')}"/></g>`); });
    s.push(`<line x1="650" y1="404" x2="662" y2="424" stroke="${lit('#7a6a50')}" stroke-width=".8"/><rect x="656" y="424" width="34" height="13" rx="2" fill="${lit('#f1e6cc')}" transform="rotate(10 656 424)"/><text x="660" y="434" class="rm-t rm-t-tag" fill="${lit('#5a4632')}" transform="rotate(10 656 424)">ミルカ</text>`);
    s.push(`<path d="M520 452 l14 -4 l3 4Z" fill="${lit('#6b7078')}"/><circle cx="694" cy="446" r="4" fill="none" stroke="${brass}" stroke-width="1.5"/>`);
  }
  if(has('bowls')){
    // 取り皿と箸、湯のみ
    [[440, 0], [740, 0]].forEach(([x]) => s.push(`<ellipse cx="${x}" cy="448" rx="24" ry="6" fill="${lit('#f3ead9')}"/><path d="M${x - 18} 446 Q${x} 462 ${x + 18} 446Z" fill="${lit('#e9dcc4')}"/><line x1="${x + 14}" y1="440" x2="${x + 40}" y2="446" stroke="${lit('#7a5434')}" stroke-width="2"/><line x1="${x + 16}" y1="437" x2="${x + 42}" y2="443" stroke="${lit('#7a5434')}" stroke-width="2"/>`));
    s.push(`<path d="M686 436 L702 436 L700 452 L688 452Z" fill="${lit('#c97b3a')}"/>`);
  }
  if(has('catdesk')){
    // 机の上で端末を見ている猫
    const c = lit('#e9e2d6');
    s.push(`<path d="M660 452 Q654 420 670 408 Q688 420 684 452Z" fill="${c}"/><circle cx="671" cy="402" r="11" fill="${c}"/><path d="M662 396 l2 -10 l6 6Z M674 392 l6 -6 l2 10Z" fill="${c}"/><path d="M684 448 q20 2 16 -22" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" class="rm-tail" style="transform-origin:684px 448px"/>`);
  }
  if(has('chips')){
    // 黄金と白金のチップ
    [[560, '#d4af37'], [584, '#e5e4e2'], [608, '#d4af37']].forEach(([x, c], k) => { for(let i = 0; i < 5 + k; i++) s.push(`<ellipse cx="${x}" cy="${448 - i * 4}" rx="10" ry="3.2" fill="${lit(c)}" stroke="${tdMix(lit(c), '#000', .3)}" stroke-width=".8"/>`); });
  }
  if(has('cards')){
    [[-20, '#f6f2ea'], [-8, '#f6f2ea'], [4, '#f6f2ea']].forEach(([rot, c]) => s.push(`<rect x="640" y="430" width="18" height="24" rx="2" fill="${lit(c)}" stroke="${lit('#c9a24a')}" stroke-width="1" transform="rotate(${rot} 649 452)"/>`));
  }
  if(has('violin')){
    const w = lit('#b0602d'), d = lit('#6a3418');
    s.push(`<g transform="rotate(-18 600 440)"><path d="M600 452 C584 452 582 438 590 430 C582 424 586 412 596 410 C592 404 596 398 604 398 C612 398 616 404 612 410 C622 412 626 424 618 430 C626 438 624 452 608 452Z" fill="${w}" stroke="${d}" stroke-width="1.2"/><rect x="602" y="356" width="4" height="44" fill="${d}"/><path d="M604 356 q6 -4 4 -10 q-6 -2 -6 4" fill="${d}"/></g><line x1="540" y1="430" x2="660" y2="414" stroke="${lit('#3a2a20')}" stroke-width="1.5"/>`);
  }
  if(has('brushes')){
    s.push(`<path d="M680 452 L700 452 L698 426 L682 426Z" fill="${lit('#e9e4d8')}"/>`);
    ['#e3462e', '#2e7de3', '#e3c22e', '#141414'].forEach((c, k) => s.push(`<line x1="${684 + k * 4}" y1="428" x2="${680 + k * 6}" y2="${396 - k * 3}" stroke="${lit('#8a6a45')}" stroke-width="2"/><circle cx="${680 + k * 6}" cy="${394 - k * 3}" r="2.4" fill="${lit(c)}"/>`));
  }
  if(has('digtools')){
    // 発掘道具：刷毛とこて、記録用の方眼の板
    s.push(`<rect x="660" y="440" width="44" height="12" fill="${lit('#f0e6d0')}" transform="rotate(-4 682 446)"/><path d="M662 440 h40 M662 446 h40 M672 438 v12 M684 438 v12 M696 438 v12" stroke="${lit('#b8a888')}" stroke-width=".6"/>`);
    s.push(`<rect x="520" y="444" width="30" height="5" rx="2" fill="${lit('#8a6a45')}"/><path d="M550 441 l10 0 l2 11 l-12 0Z" fill="${lit('#c9a07a')}"/><path d="M500 452 l14 -10 l4 4 l-16 8Z" fill="${lit('#8a8f96')}"/><rect x="514" y="438" width="10" height="4" rx="2" fill="${lit('#6b4f33')}" transform="rotate(-35 519 440)"/>`);
  }
  if(has('skydrink')) s.push(`<path d="M590 410 L614 410 L610 452 L594 452Z" fill="url(#rm-sky)" stroke="#ffffff" stroke-width="1.5" opacity=".9"/><circle cx="602" cy="420" r="3" fill="#ffe066"/>`);
  if(has('clutter')){
    // 机の上も散らかっている
    s.push(`<rect x="520" y="440" width="26" height="12" fill="${lit('#c9a7b8')}" transform="rotate(-12 533 446)"/><path d="M570 452 L576 420 L586 420 L590 452Z" fill="${lit('#e8c8d8')}" opacity=".7"/><path d="M610 452 l30 -4 l-4 4Z" fill="${lit('#8a7480')}"/><ellipse cx="660" cy="450" rx="10" ry="3" fill="${lit('#7a5a68')}"/>`);
  }
  return s.join('');
}

/* ---------- 床・窓辺 ---------- */
function tdFloorProps(st, id, lit, dark, accent, L, h, g){
  const s = [];
  const has = p => st.props.includes(p);
  const WX = g.WX;
  if(has('plant')) s.push(`<path d="M${WX + 30} 432 L${WX + 56} 432 L${WX + 52} 452 L${WX + 34} 452Z" fill="${lit('#6b5a4a')}"/><path d="M${WX + 43} 432 C${WX + 30} 410 ${WX + 20} 404 ${WX + 16} 396 M${WX + 43} 432 C${WX + 48} 410 ${WX + 58} 402 ${WX + 68} 398 M${WX + 43} 432 C${WX + 42} 414 ${WX + 40} 404 ${WX + 43} 392" stroke="${lit('#4f8a5c')}" stroke-width="4" stroke-linecap="round" fill="none"/>`);
  if(has('cat')){
    const c = lit('#8a8f98');
    if(h >= 21 || h < 6) s.push(`<ellipse cx="${WX + 90}" cy="434" rx="30" ry="14" fill="${c}"/><circle cx="${WX + 66}" cy="430" r="11" fill="${c}"/><path d="M${WX + 58} 422 l3 -9 l5 7Z M${WX + 68} 420 l4 -8 l3 9Z" fill="${c}"/><path d="M${WX + 118} 438 q14 6 4 -8" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    else s.push(`<path d="M${WX + 74} 446 Q${WX + 70} 410 ${WX + 86} 396 Q${WX + 104} 410 ${WX + 100} 446Z" fill="${c}"/><circle cx="${WX + 87}" cy="390" r="12" fill="${c}"/><path d="M${WX + 77} 382 l2 -11 l7 7Z M${WX + 90} 378 l7 -7 l2 11Z" fill="${c}"/><path class="rm-tail" style="transform-origin:${WX + 100}px 440px" d="M${WX + 100} 440 q24 -4 20 -30" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  }
  if(has('dog')){
    // 雪犬：とても大きく、毛の塊のよう。顔まわりの毛が目にかかっている。部屋の右側に座っている
    const cx = 1078, base = 612;
    const fur = 'url(#rm-dogfur)', furW = lit('#ffffff'), furS = lit('#d6dfe8'), line = lit('#c3cfdb'), ear = lit('#ece4d8');
    const scallop = (x0, y0, rx, ry, n, amp, a0) => {
      a0 = a0 || 0; let d = '';
      for(let i = 0; i <= n; i++){
        const a = a0 + i / n * Math.PI * 2, x = x0 + Math.cos(a) * rx, y = y0 + Math.sin(a) * ry;
        if(i === 0){ d = `M${x.toFixed(1)} ${y.toFixed(1)}`; continue; }
        const am = a0 + (i - .5) / n * Math.PI * 2;
        d += ` Q${(x0 + Math.cos(am) * (rx + amp)).toFixed(1)} ${(y0 + Math.sin(am) * (ry + amp)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d + 'Z';
    };
    s.push(`<ellipse cx="${cx}" cy="${base}" rx="130" ry="10" fill="#2a3a4a" opacity=".2"/>`);
    // しっぽ
    s.push(`<g class="rm-tail" style="transform-origin:${cx + 70}px ${base - 40}px"><path d="${scallop(cx + 104, base - 96, 30, 50, 12, 7, .3)}" fill="${furS}"/><path d="${scallop(cx + 100, base - 100, 25, 44, 12, 6, .3)}" fill="${fur}"/></g>`);
    // 胴体（呼吸でわずかにふくらむ）
    s.push(`<g class="rm-breathe"><path d="${scallop(cx, base - 84, 108, 88, 24, 9)}" fill="${furS}"/><path d="${scallop(cx - 3, base - 88, 102, 82, 24, 8)}" fill="${fur}"/></g>`);
    // 首まわりの毛（胸）
    s.push(`<path d="${scallop(cx, base - 150, 74, 58, 18, 8)}" fill="${furW}"/>`);
    [[-30, -150], [0, -134], [30, -150], [-14, -116], [16, -116]].forEach(([dx, dy]) => s.push(`<path d="M${cx + dx - 8} ${base + dy} q8 10 16 0" stroke="${line}" stroke-width="1.6" fill="none"/>`));
    // 前足
    [-30, 30].forEach(dx => {
      s.push(`<rect x="${cx + dx - 18}" y="${base - 110}" width="36" height="104" rx="18" fill="${fur}"/>`);
      s.push(`<path d="${scallop(cx + dx, base - 8, 22, 10, 8, 4, Math.PI)}" fill="${furW}"/><path d="M${cx + dx - 7} ${base - 10} l0 6 M${cx + dx + 7} ${base - 10} l0 6" stroke="${line}" stroke-width="1.4"/>`);
    });
    // 垂れ耳
    s.push(`<path d="${scallop(cx - 58, base - 214, 20, 36, 10, 5, .4)}" fill="${ear}"/><path d="${scallop(cx + 58, base - 214, 20, 36, 10, 5, -.4)}" fill="${ear}"/>`);
    // 頭
    s.push(`<path d="${scallop(cx, base - 228, 62, 56, 20, 7)}" fill="${fur}"/>`);
    // 目（前髪に半分かくれている）
    [-22, 22].forEach(dx => s.push(`<ellipse cx="${cx + dx}" cy="${base - 228}" rx="6" ry="6.5" fill="#1f2630"/><circle cx="${cx + dx - 1.5}" cy="${base - 230}" r="1.8" fill="#ffffff"/>`));
    s.push(`<path d="M${cx - 50} ${base - 236} Q${cx - 34} ${base - 252} ${cx - 18} ${base - 236} Q${cx} ${base - 254} ${cx + 18} ${base - 236} Q${cx + 34} ${base - 252} ${cx + 50} ${base - 236} Q${cx + 40} ${base - 262} ${cx} ${base - 270} Q${cx - 40} ${base - 262} ${cx - 50} ${base - 236}Z" fill="${furW}"/>`);
    // マズルと鼻、口
    s.push(`<ellipse cx="${cx}" cy="${base - 202}" rx="30" ry="21" fill="${furW}"/>`);
    s.push(`<path d="M${cx - 9} ${base - 212} Q${cx} ${base - 217} ${cx + 9} ${base - 212} Q${cx + 8} ${base - 202} ${cx} ${base - 200} Q${cx - 8} ${base - 202} ${cx - 9} ${base - 212}Z" fill="#1f2630"/><ellipse cx="${cx - 3}" cy="${base - 211}" rx="2.6" ry="1.4" fill="#ffffff" opacity=".5"/>`);
    s.push(`<path d="M${cx} ${base - 200} l0 5 M${cx - 10} ${base - 192} q5 4 10 -1 q5 5 10 1" stroke="#5a6676" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M${cx - 4} ${base - 191} q4 7 8 0Z" fill="${lit('#e88a9a')}"/>`);
  }
  if(has('easel')){
    // 描きかけの大きなキャンバス（未完の創造）。絵の具が床まで垂れている
    const w = lit('#8a6a45');
    s.push(`<line x1="30" y1="612" x2="72" y2="320" stroke="${w}" stroke-width="7"/><line x1="140" y1="612" x2="98" y2="320" stroke="${w}" stroke-width="7"/><line x1="85" y1="320" x2="96" y2="614" stroke="${w}" stroke-width="5"/>`);
    s.push(`<rect x="14" y="340" width="150" height="180" fill="${lit('#fbf7ef')}" stroke="${lit('#d8cdb8')}" stroke-width="2"/>`);
    s.push(`<path d="M24 470 q30 -90 70 -50 q24 20 56 -40" stroke="${lit('#2e7de3')}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M30 380 q40 30 110 -10" stroke="${lit('#e3462e')}" stroke-width="5" fill="none" opacity=".9"/><circle cx="128" cy="372" r="16" fill="${lit('#e3c22e')}" opacity=".85"/><path d="M40 500 l20 -40 l14 30 l22 -50 l18 60" stroke="${lit('#141414')}" stroke-width="3" fill="none"/>`);
    s.push(`<path d="M60 520 l0 30 q0 6 4 6 q4 0 4 -6 l0 -30Z M118 520 l0 54 q0 6 4 6 q4 0 4 -6 l0 -54Z" fill="${lit('#2e7de3')}"/><rect x="14" y="520" width="150" height="10" fill="${w}"/>`);
    // パレット
    s.push(`<ellipse cx="220" cy="600" rx="40" ry="12" fill="${lit('#c9a07a')}"/>`);
    ['#e3462e', '#2e7de3', '#e3c22e', '#3ab36a', '#141414'].forEach((c, k) => s.push(`<circle cx="${196 + k * 12}" cy="${597 + (k % 2) * 4}" r="4" fill="${lit(c)}"/>`));
  }
  if(has('hatch')) s.push(`<rect x="520" y="566" width="120" height="40" rx="3" fill="${lit('#b9cfdd')}" stroke="${lit('#8aa3b8')}" stroke-width="3"/><rect x="570" y="582" width="20" height="6" rx="3" fill="${lit('#6b7f92')}"/>`);
  if(has('clutter')){
    // 床に散らかった物：空き瓶、箱、脱いだままの服、食べかけの培養肉のトレー
    const r = tdRand('clutter');
    s.push(`<path d="M120 600 Q160 570 220 590 Q250 600 230 612 L130 614Z" fill="${lit('#8a5a7a')}"/><path d="M700 590 L760 584 L766 604 L706 610Z" fill="${lit('#d8c8b8')}"/><rect x="820" y="560" width="50" height="40" fill="${lit('#b8a090')}" transform="rotate(8 845 580)"/>`);
    for(let i = 0; i < 6; i++){ const x = 260 + r() * 520, y = 570 + r() * 40; s.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="8" height="22" rx="3" fill="${lit(r() < .5 ? '#c9a7b8' : '#9ab8a8')}" opacity=".8" transform="rotate(${(70 + r() * 40).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`); }
    s.push(`<ellipse cx="560" cy="600" rx="30" ry="8" fill="${lit('#e8e0e4')}"/><ellipse cx="556" cy="598" rx="14" ry="4" fill="${lit('#b2483a')}"/>`);
  }
  if(has('costume')){
    // 歴史衣装（日常的に着る復元の上着）を掛けたトルソー
    const c = lit('#7a3a2a'), g = lit('#c9a24a');
    s.push(`<line x1="70" y1="612" x2="70" y2="520" stroke="${lit('#5a4632')}" stroke-width="4"/><path d="M40 612 L100 612" stroke="${lit('#5a4632')}" stroke-width="4"/>`);
    s.push(`<path d="M40 380 Q70 366 100 380 L108 520 Q70 532 32 520Z" fill="${c}"/><path d="M70 372 L70 520" stroke="${g}" stroke-width="2"/>${[400, 430, 460, 490].map(y => `<circle cx="70" cy="${y}" r="2.6" fill="${g}"/>`).join('')}<path d="M40 380 L24 470 L36 474 L48 400" fill="${c}"/><path d="M100 380 L116 470 L104 474 L92 400" fill="${c}"/><ellipse cx="70" cy="368" rx="14" ry="6" fill="${lit('#e9dcc0')}"/>`);
  }
  if(has('chairs')){
    // 食卓のまわりの椅子（いつでも誰かが座れるように）
    const w = lit('#6a4428');
    [430, 620].forEach(x => s.push(`<rect x="${x - 34}" y="470" width="68" height="10" rx="3" fill="${w}"/><rect x="${x - 30}" y="420" width="8" height="190" rx="3" fill="${w}"/><rect x="${x + 22}" y="420" width="8" height="190" rx="3" fill="${w}"/><rect x="${x - 30}" y="430" width="60" height="8" rx="3" fill="${w}"/><rect x="${x - 30}" y="452" width="60" height="6" rx="3" fill="${w}"/>`));
  }
  if(has('robot')){
    // 管理者がいなくても動き続ける掃除ロボット
    s.push(`<g class="rm-roam"><ellipse cx="420" cy="602" rx="34" ry="10" fill="${lit('#3a3a44')}"/><rect x="390" y="586" width="60" height="16" rx="8" fill="${lit('#8a8f98')}"/><circle cx="430" cy="592" r="3" fill="#ff3fb0" class="rm-twinkle"/></g>`);
  }
  return s.join('');
}

// 背景色に対して読みやすい文字色
function tdContrast(hex){
  const [r, g, b] = tdHex(hex);
  return (r * .299 + g * .587 + b * .114) > 150 ? '#1a2233' : '#ffffff';
}

/* --------------------------------------------------------------------------
   10. 部屋ページ
   -------------------------------------------------------------------------- */

const TD_ROOM_KEY = 'moonCoreRoomNation';
let tdRoomTimer = null;
let tdBookSalt = '';

function tdRoomNationId(hashId){
  const ids = tdNations().map(n => n.id);
  if(hashId && ids.includes(hashId)) return hashId;
  try { const s = localStorage.getItem(TD_ROOM_KEY); if(s && ids.includes(s)) return s; } catch(e){}
  return ids.includes('niporan') ? 'niporan' : ids[0];
}

function renderRoomPage(hashId){
  if(typeof setBackgroundTheme === 'function') setBackgroundTheme(null);
  const hero = document.getElementById('home-hero'); if(hero) hero.style.display = 'none';

  const id = tdRoomNationId(hashId);
  try { localStorage.setItem(TD_ROOM_KEY, id); } catch(e){}
  const nation = articleById(id);
  tdBookSalt = '';

  const nations = tdNations();
  const chips = nations.map(n => `
    <a class="rm-chip${n.id === id ? ' is-active' : ''}" href="#/room/${n.id}" style="--nc:${n.accentColor || '#1F6BFF'}" ${n.id === id ? 'aria-current="page"' : ''}>${n.title}</a>`).join('');

  document.getElementById('app').innerHTML = `
    <div class="page-header rm-page-header" style="--nation-accent:${nation.accentColor || '#1F6BFF'}">
      <div class="breadcrumb">
        <a href="#/">MOON CORE</a><span>/</span>
        <span style="color:var(--text-primary)">部屋</span>
      </div>
      <div class="title-block fade-seq">
        <span class="cat-badge">今日の世界</span>
        <h1>${nation.title}の部屋</h1>
        <p class="lede">その国に暮らす、誰かの一室。部屋の様子は暮らしの一例。窓の外の景色、壁のカレンダー、机の端末から、その国の「今日」をのぞける。</p>
      </div>
    </div>
    <div class="rm-wrap">
      <nav class="rm-chips" aria-label="部屋のある国">${chips}</nav>
      <div class="rm-stage" id="rm-stage"></div>
      <p class="rm-hint">窓・カレンダー・机の端末を押すと、その内容を下に表示します。時間帯は、あなたの時計に合わせて変わります。</p>
      <div class="rm-cards" id="rm-cards"></div>
      <section class="rm-world">
        <div class="rm-world-head">
          <div class="section-title">世界の空模様</div>
          <div class="section-sub">WORLD WEATHER — 押すとその国の部屋へ移動します</div>
        </div>
        <div class="rm-world-grid" id="rm-world-grid"></div>
      </section>
    </div>`;

  tdRoomDraw(id);

  // 部屋のある国の環境音にする（音の設定がオンのときだけ鳴る）
  setTimeout(() => { if(window.MCSound) MCSound.focusNation(id); }, 0);

  const chipActive = document.querySelector('.rm-chip.is-active');
  if(chipActive){ const box = chipActive.parentElement; box.scrollLeft = chipActive.offsetLeft - box.clientWidth / 2 + chipActive.offsetWidth / 2; }

  clearInterval(tdRoomTimer);
  tdRoomTimer = setInterval(() => {
    if(!location.hash.startsWith('#/room')){ clearInterval(tdRoomTimer); return; }
    tdRoomDraw(id, true);
  }, 60000);
}

function tdRoomInfo(nation, now){
  const m = now.getMonth() + 1, d = now.getDate();
  const nationNews = tdNewsFor(nation.id);
  return {
    events: tdEventsOn(m, d, nation.title),
    otherToday: tdEventsOn(m, d).filter(ev => !(ev.countries || []).some(c => c === TD_WORLD || c === nation.title)),
    next: tdNextEvents(now, nation.title),
    nationNews,
    news: nationNews.length ? nationNews : tdNews().slice(0, 3)
  };
}

function tdRoomDraw(id, sceneOnly){
  const stage = document.getElementById('rm-stage');
  if(!stage) return;
  const now = tdNow();
  const nation = articleById(id);
  const wx = tdWeather(id, now) || { kind:'clear', label:'—', hi:0, lo:0, cur:0, note:'' };
  const ph = tdPhase(now, id, wx);
  const info = tdRoomInfo(nation, now);

  stage.style.setProperty('--rm-light', ph.light.toFixed(2));
  stage.innerHTML = tdRoomSvg(nation, now, wx, ph, info);
  stage.querySelectorAll('.rm-hot').forEach(g => {
    const go = () => tdRoomFocus(g.dataset.target);
    g.addEventListener('click', go);
    g.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); } });
  });
  if(window.MCSound) stage.querySelectorAll('.rm-hot').forEach(g => g.addEventListener('mouseenter', () => MCSound.play('hover')));

  if(sceneOnly){ tdRoomWindowCard(nation, now, wx, ph); return; }
  tdRoomCards(nation, now, wx, ph, info);
  tdRoomWorld(id, now);
}

function tdRoomFocus(targetId){
  const el = document.getElementById(targetId);
  if(!el) return;
  if(window.MCSound) MCSound.play('tap');
  const top = el.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76) - 16;
  window.scrollTo({ top, behavior:'smooth' });
  el.classList.remove('is-focus'); void el.offsetWidth; el.classList.add('is-focus');
}

function tdRoomWindowHtml(nation, now, wx, ph){
  const c = wx.climate;
  const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
  return `
    <div class="rm-card-head"><span class="rm-card-kicker">窓の外</span><span class="rm-card-time">${hh}:${mm} ・ ${ph.label}</span></div>
    <div class="rm-wx">
      <div class="rm-wx-icon">${tdIcon(wx.kind, ph.light < .2)}</div>
      <div>
        <div class="rm-wx-label">${wx.label}</div>
        <div class="rm-wx-temp">${tdDeg(wx.cur)}<small>${wx.kind === 'indoor' ? '施設の外 ・ ' : ''}最高 ${tdDegInt(wx.hi)} ／ 最低 ${tdDegInt(wx.lo)}</small></div>
      </div>
    </div>
    ${wx.note ? `<p class="rm-card-note">${wx.note}</p>` : ''}
    ${c ? `<dl class="rm-dl"><div><dt>気候帯</dt><dd>${c.climateZone}</dd></div><div><dt>年平均気温</dt><dd>${c.averageTemperature}</dd></div></dl>` : ''}
    <a class="rm-card-link" href="#/article/${nation.id}">${nation.title}の資料を開く →</a>`;
}

function tdRoomWindowCard(nation, now, wx, ph){
  const el = document.getElementById('rm-card-window');
  if(el) el.innerHTML = tdRoomWindowHtml(nation, now, wx, ph);
}

function tdRoomCards(nation, now, wx, ph, info){
  const m = now.getMonth() + 1, d = now.getDate();
  const evItem = ev => `
    <a class="rm-item" href="#/calendar/${ev.id}">
      <span class="rm-item-tag">${ev.type}</span>
      <span class="rm-item-name">${ev.name}</span>
      <span class="rm-item-desc">${tdShort(ev.description, 60)}</span>
    </a>`;
  let evHtml = info.events.length
    ? info.events.map(evItem).join('')
    : `<p class="rm-empty">今日の${nation.title}に、登録されている行事はありません。</p>`;
  if(info.next){
    evHtml += `<div class="rm-sub">次の行事 ・ あと${info.next.days}日（${info.next.month}月${info.next.day}日）</div>` +
      info.next.events.slice(0, 2).map(evItem).join('');
  }
  if(info.otherToday.length){
    evHtml += `<a class="rm-card-link rm-card-link--soft" href="#/calendar">今日、ほかの国では ${info.otherToday.length}件の行事 →</a>`;
  }

  const newsItem = n => `
    <a class="rm-item" href="#/news/${n.id}">
      <span class="rm-item-tag">${n.updated}</span>
      <span class="rm-item-name">${n.title}</span>
      <span class="rm-item-desc">${tdShort(n.text, 60)}</span>
    </a>`;
  const offline = tdRoomStyle(nation.id).terminal === 'offline';
  const newsHtml = (offline ? `<p class="rm-empty">この部屋の端末は外のネットワークにつながっていない。以下は、外の世界での報道。</p>` : '') + (info.nationNews.length ? '' : `<p class="rm-empty">${nation.title}に関するニュースは、まだありません。世界の新着を表示しています。</p>`) +
    info.news.slice(0, 3).map(newsItem).join('');

  const accent = nation.accentColor || '#1F6BFF';
  document.getElementById('rm-cards').innerHTML = `
    <article class="rm-card" id="rm-card-window">${tdRoomWindowHtml(nation, now, wx, ph)}</article>
    <article class="rm-card" id="rm-card-events" style="--nc:${accent}">
      <div class="rm-card-head"><span class="rm-card-kicker">壁のカレンダー</span><span class="rm-card-time">${m}月${d}日</span></div>
      ${evHtml}
      <a class="rm-card-link" href="#/calendar">世界カレンダーへ →</a>
    </article>
    <article class="rm-card" id="rm-card-news">
      <div class="rm-card-head"><span class="rm-card-kicker">机の端末</span><span class="rm-card-time">NEWS</span></div>
      ${newsHtml}
      <a class="rm-card-link" href="#/news">世界ニュースへ →</a>
    </article>
    <article class="rm-card" id="rm-card-book">${tdRoomBookHtml(now)}</article>`;
  tdBindBook(now);
}

function tdRoomBookHtml(now){
  const a = tdDailyArticle(now, tdBookSalt);
  if(!a) return '';
  const c = catByKey(a.cat);
  const seen = tdExplored();
  return `
    <div class="rm-card-head"><span class="rm-card-kicker">MOON CORE の今日の一項目</span><span class="rm-card-time">${tdBookSalt ? 'ほかの項目' : 'TODAY'}</span></div>
    <a class="rm-book" href="#/article/${a.id}" style="--bc:${c ? c.color : 'var(--accent-signal)'}">
      <span class="rm-book-cat">${c ? c.name : ''}${seen.has(a.id) ? '' : '<em>未読</em>'}</span>
      <span class="rm-book-title">${a.title}</span>
      <span class="rm-book-lede">${tdShort(a.lede || '', 90)}</span>
    </a>
    <div class="rm-book-actions">
      <a class="rm-card-link" href="#/article/${a.id}">読む →</a>
      <button type="button" class="rm-reroll" id="rm-reroll">ほかの項目を見る</button>
    </div>`;
}
function tdBindBook(now){
  const b = document.getElementById('rm-reroll');
  if(!b) return;
  b.addEventListener('click', () => {
    tdBookSalt = ':' + Math.random().toString(36).slice(2, 8);
    document.getElementById('rm-card-book').innerHTML = tdRoomBookHtml(now);
    tdBindBook(now);
    if(window.MCSound) MCSound.play('tap');
  });
}

function tdRoomWorld(currentId, now){
  const grid = document.getElementById('rm-world-grid');
  if(!grid) return;
  grid.innerHTML = tdNations().map(n => {
    const wx = tdWeather(n.id, now);
    if(!wx) return '';
    const ph = tdPhase(now, n.id, wx);
    return `
      <a class="rm-w${n.id === currentId ? ' is-active' : ''}" href="#/room/${n.id}" style="--nc:${n.accentColor || '#1F6BFF'}">
        <span class="rm-w-name">${n.title}</span>
        <span class="rm-w-icon">${tdIcon(wx.kind, ph.light < .2)}</span>
        <span class="rm-w-label">${wx.label}</span>
        <span class="rm-w-temp">${tdDegInt(wx.cur)}</span>
      </a>`;
  }).join('');
}

/* --------------------------------------------------------------------------
   11. ヘッダー：「部屋」ボタンと「⋯」メニュー
   -------------------------------------------------------------------------- */

(function(){
  function closeMore(){
    const w = document.getElementById('more-wrap');
    if(!w) return;
    w.classList.remove('open');
    const b = w.querySelector('.more-btn'); if(b) b.setAttribute('aria-expanded', 'false');
  }
  function themeLabel(){
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark ? 'ライトモードにする' : 'ダークモードにする';
  }
  function setup(){
    const actions = document.querySelector('.header-actions');
    const wrap = document.getElementById('more-wrap');
    if(!actions || !wrap) return;

    // サウンドのボタンはメニューから開くので、ヘッダー右端に寄せて見えなくする
    const snd = actions.querySelector('.snd-wrap');
    if(snd){ snd.classList.add('is-in-menu'); actions.appendChild(snd); }

    const btn = wrap.querySelector('.more-btn');
    const menu = wrap.querySelector('.more-menu');
    const themeItem = menu.querySelector('[data-act="theme"] span');
    if(themeItem) themeItem.textContent = themeLabel();

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !wrap.classList.contains('open');
      document.querySelectorAll('.nav-dropdown.open').forEach(el => el.classList.remove('open'));
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      if(themeItem) themeItem.textContent = themeLabel();
    });
    menu.addEventListener('click', e => {
      const item = e.target.closest('[data-act]');
      if(!item){ e.stopPropagation(); return; }
      const act = item.dataset.act;
      if(act === 'theme'){
        e.stopPropagation();
        if(typeof toggleTheme === 'function') toggleTheme();
        if(themeItem) themeItem.textContent = themeLabel();
      } else if(act === 'sound'){
        e.stopPropagation();
        closeMore();
        const sb = document.getElementById('snd-btn');
        if(sb) sb.click();
      } else {
        closeMore();
      }
    });
    document.addEventListener('click', closeMore);
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeMore(); });
    window.addEventListener('hashchange', () => {
      closeMore();
      const sp = document.getElementById('snd-panel');
      if(sp && !sp.hidden){ sp.hidden = true; const sb = document.getElementById('snd-btn'); if(sb) sb.setAttribute('aria-expanded', 'false'); }
      const rb = document.querySelector('.room-btn');
      if(rb) rb.classList.toggle('is-active', location.hash.startsWith('#/room'));
    });
    const rb = document.querySelector('.room-btn');
    if(rb) rb.classList.toggle('is-active', location.hash.startsWith('#/room'));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0));
  else setTimeout(setup, 0);
})();
