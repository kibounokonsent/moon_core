/* =====================================================================
   世界地図（インタラクティブ版）
   - assets/world-map.svg の国境形状をそのまま使い、サイトの配色で描き直す
   - 国をタップ／クリック → 右（スマホでは下）のパネルに国家の概要を表示
   - 選択中の国をもう一度タップ、または「資料を開く」で国家記事へ移動
   - 国を追加・変更するときは、下の WM_SHAPES にパスを足すだけ
   ===================================================================== */

/* 国境の形（world-map.svg から抽出。描画順＝重なり順なので順番は変えない） */
const WM_SHAPES = [
  { id:'kyuma',             color:'#c49270', d:'M78.40463,205.50015v-39.29465h64.87263v39.29465z' },
  { id:'garhyura',          color:'#bb5c5c', d:'M217.71801,153.46213h-134.25659v-39.29465h29.45881l0.35281,-19.93318h35.35487v-26.93038l60.67828,-0.3528v26.93039h79.26581v39.29465h-70.85398z' },
  { id:'niporan',           color:'#eb6161', d:'M219.27619,181.21576h-39.29465v-48.11464l108.5316,-0.15634v17.7979h-69.23695z' },
  { id:'yuretsuea',         color:'#a572e8', d:'M132.20657,203.50094v-61.63863h64.87263v61.63863z' },
  { id:'hubert',            color:'#56b5e8', d:'M118.58129,121.51753v20.28599h28.224v39.29465h-116.02862v-39.29465h15.28798v-20.28599h10.28998v-25.57797h39.29465v25.57797z' },
  { id:'orgaron',           color:'#e8776d', d:'M125.1506,218.73012v-37.63198h-32.92799v-39.29465h71.63464v76.96915z' },
  { id:'belnea',            color:'#6aba95', d:'M100.94129,210.45246v39.29465h-9.11401v32.33997h-39.29465v-32.33997h-9.99598v-24.108h-26.63636v-39.29465h56.52303v24.108z' },
  { id:'niporan',           color:'#eb6161', d:'M225.74651,170.537v-14.59666h14.59666v14.59666z' },
  { id:'wonhead',           color:'#e8a46d', d:'M436.24807,120.53412v39.29465h-10.14298v29.10598h-19.40406v23.37297h-39.29465v-23.37297h-15.87596v-29.10598h-7.93799v-26.90097h-48.06896v-39.29465h127.49456v26.90097z' },
  { id:'larliafrus',        color:'#77d800', d:'M464.65651,300.46203h-24.07871v17.19902h-27.12306v-60.41696h-7.05595v-39.29465h39.29465v15.43496h24.69602v39.29465h-5.73295z' },
  { id:'sanrudo',           color:'#ffcd00', d:'M189.24257,291.80555v-39.29465h60.02164v39.29465z' },
  { id:'sanrudo',           color:'#ffcd00', d:'M167.93582,247.0783v-39.29465h21.53707v39.29465z' },
  { id:'sanrudo',           color:'#ffcd00', d:'M233.31979,247.07831h-39.29465v-15.18667h39.29465z' },
  { id:'sertcity',          color:'#606eff', d:'M195.196,225.78295v-15.26017h15.26017v15.26017z' },
  { id:'maimok',            color:'#ff78d9', d:'M381.70101,55.69861h40.6176l0.17641,33.56166h-62.66762v-20.33167h21.87361z' },
  { id:'chiriludo-ailtsua', color:'#79c2bc', d:'M480.78896,121.41619h-39.29465v-20.28599h-10.58399v-39.29465l49.87864,0.05062z' },
  { id:'chiriludo-ailtsua', color:'#79c2bc', d:'M-0.78896,60.91102l23.87864,0.92452v39.29465h-10.58399v20.28599h-13.29465z' },
  { id:'tasumenio',         color:'#2f7bff', d:'M289.61195,241.60345v-29.10011h29.10011v29.10011z' },
  { id:'niporan',           color:'#eb6161', d:'M216.46147,202.71873v-14.85011h9.09952v-12.94848h14.85011v27.86544z' },
  { id:'niporan',           color:'#eb6161', d:'M204.47984,202.67034v-14.59666h5.93v14.59666z' },
  { id:'fumora-skypill',    color:'#d9ce00', d:'M271.68329,83.10262v-40.73775h40.73775v40.73775z', sky:true }
];

/* フーモラ（空中都市）の内部紋様 */
const WM_FUMORA_GLYPH = [
  'M286.61161,68.18782v-10.91606h10.91606v10.91606z',
  'M279.825,50.4498l11.12982,-0.01416v4.56141h-6.62502v6.61087h-4.56141z',
  'M279.76838,63.85168h4.56141v6.61087h6.62502v4.56141l-11.12982,-0.01415z',
  'M304.37086,61.60791h-4.56141v-6.61087h-6.62502v-4.56141l11.12982,0.01416z',
  'M304.31423,75.00981l-11.12982,0.01416v-4.56141h6.62502v-6.61087h4.56141z'
];

/* 地図上の国名ラベル（x,y は文字の中心。vertical は縦書き、anchor は寄せ方） */
const WM_LABELS = [
  { id:'garhyura',          text:'ガルヒューラ', x:197,   y:108 },
  { id:'hubert',            text:'ヒューバート', x:82,    y:132 },
  { id:'niporan',           text:'ニポラン',     x:254,   y:142 },
  { id:'yuretsuea',         text:'ユーレ|ツェア', x:180.5, y:166 },
  { id:'orgaron',           text:'オルガロン',   x:128,   y:162 },
  { id:'kyuma',             text:'キューマ',     x:103,   y:194 },
  { id:'belnea',            text:'ベルネア',     x:68,    y:236 },
  { id:'wonhead',           text:'ヲンヘード',   x:388,   y:146 },
  { id:'larliafrus',        text:'ラリアフルス', x:438,   y:262 },
  { id:'sanrudo',           text:'サンルド',     x:219,   y:272 },
  { id:'sertcity',          text:'セルトシティ', x:214,   y:218, anchor:'start', small:true },
  { id:'tasumenio',         text:'タスメニオ',   x:304,   y:252, small:true },
  { id:'maimok',            text:'マイモック',   x:392,   y:76 },
  { id:'chiriludo-ailtsua', text:'チリルド',     x:456,   y:88 },
  { id:'chiriludo-ailtsua', text:'チリルド',     x:11,    y:88, vertical:true, small:true },
  { id:'fumora-skypill',    text:'フーモラ',     x:336,   y:63,  small:true }
];

/* 地図の表示範囲（海の外枠に少し余白をとる） */
const WM_VIEW = { x:-10, y:18, w:500, h:324 };
const WM_SEA  = { x:-1.25, y:26.67, w:482.5, h:306.67 };

let wmSelected = null;

function wmEsc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* 国家記事の info ブロックから、指定ラベルの値を取り出す */
function wmInfo(a, label){
  for(const s of (a.sections || [])){
    for(const b of (s.blocks || [])){
      if(b.t === 'info' && Array.isArray(b.items)){
        const it = b.items.find(i => i.label === label);
        if(it) return it.value;
      }
    }
  }
  return null;
}

function wmSeen(){
  try { return new Set(JSON.parse(localStorage.getItem('moonCoreExplored') || '[]')); }
  catch(e){ return new Set(); }
}

function wmBuildSvg(){
  const ids = [...new Set(WM_SHAPES.map(s => s.id))];

  // 経緯線（グリッド）
  let grid = '';
  const step = WM_SEA.w / 10;
  for(let i = 1; i < 10; i++){
    const x = (WM_SEA.x + step * i).toFixed(2);
    grid += `<line x1="${x}" y1="${WM_SEA.y}" x2="${x}" y2="${WM_SEA.y + WM_SEA.h}"/>`;
  }
  const vstep = WM_SEA.h / 6;
  for(let i = 1; i < 6; i++){
    const y = (WM_SEA.y + vstep * i).toFixed(2);
    grid += `<line x1="${WM_SEA.x}" y1="${y}" x2="${WM_SEA.x + WM_SEA.w}" y2="${y}"/>`;
  }
  // 端の目盛り（A〜J / 1〜6）
  let ticks = '';
  'ABCDEFGHIJ'.split('').forEach((ch, i) => {
    ticks += `<text x="${(WM_SEA.x + step * (i + .5)).toFixed(2)}" y="${WM_SEA.y - 3}">${ch}</text>`;
  });
  for(let i = 0; i < 6; i++){
    ticks += `<text x="${WM_SEA.x - 4.5}" y="${(WM_SEA.y + vstep * (i + .5) + 1.5).toFixed(2)}">${i + 1}</text>`;
  }

  // 国ごとにまとめる（同じ国の島々は1つの <g> に）
  const groups = ids.map(id => {
    const a = articleById(id);
    const name = a ? a.title : id;
    const shapes = WM_SHAPES.filter(s => s.id === id);
    const sky = shapes.some(s => s.sky);
    const paths = shapes.map(s => `<path d="${s.d}"/>`).join('');
    const glyph = sky ? `<g class="wm-glyph">${WM_FUMORA_GLYPH.map(d => `<path d="${d}"/>`).join('')}</g>
      <circle class="wm-orbit" cx="292.05" cy="62.73" r="29"/>` : '';
    return `<g class="wm-nation${sky ? ' is-sky' : ''}" data-id="${id}" style="--nc:${shapes[0].color}"
      tabindex="0" role="button" aria-label="${wmEsc(name)}">${paths}${glyph}</g>`;
  });
  // 重なり順を保つため、形は WM_SHAPES の順に並べたいが、国単位の <g> が必要。
  // 実際の重なりが問題になる箇所（ユーレツェア／オルガロン／キューマ／ベルネア）は
  // ids の順（＝最初に現れた順）で再現できる。

  const labels = WM_LABELS.map(l => {
    const cls = 'wm-label' + (l.small ? ' is-small' : '');
    const anchor = l.anchor || 'middle';
    if(l.vertical){
      const chars = l.text.split('');
      const lh = 8.2;
      const top = l.y - (chars.length - 1) * lh / 2;
      return `<text class="${cls}" data-for="${l.id}" text-anchor="middle">${chars.map((c, i) =>
        `<tspan x="${l.x}" y="${(top + i * lh + 3).toFixed(2)}">${c}</tspan>`).join('')}</text>`;
    }
    const lines = l.text.split('|');
    const lh = 10.5;
    const top = l.y - (lines.length - 1) * lh / 2;
    return `<text class="${cls}" data-for="${l.id}" text-anchor="${anchor}">${lines.map((t, i) =>
      `<tspan x="${l.x}" y="${(top + i * lh + 3.4).toFixed(2)}">${t}</tspan>`).join('')}</text>`;
  }).join('');

  return `
  <svg class="wm-svg" viewBox="${WM_VIEW.x} ${WM_VIEW.y} ${WM_VIEW.w} ${WM_VIEW.h}" role="group" aria-label="未来世界 世界地図">
    <defs>
      <pattern id="wm-dots" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".45" class="wm-dot"/>
      </pattern>
      <filter id="wm-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect class="wm-sea" x="${WM_SEA.x}" y="${WM_SEA.y}" width="${WM_SEA.w}" height="${WM_SEA.h}"/>
    <rect class="wm-sea-dots" x="${WM_SEA.x}" y="${WM_SEA.y}" width="${WM_SEA.w}" height="${WM_SEA.h}" fill="url(#wm-dots)"/>
    <g class="wm-grid">${grid}</g>
    <g class="wm-ticks">${ticks}</g>
    <g class="wm-wrap-hint">
      <path d="M2,128 l-2,3 l2,3"/><path d="M478,128 l2,3 l-2,3"/>
    </g>
    <g class="wm-nations">${groups.join('')}</g>
    <g class="wm-labels" aria-hidden="true">${labels}</g>
    <rect class="wm-frame" x="${WM_SEA.x}" y="${WM_SEA.y}" width="${WM_SEA.w}" height="${WM_SEA.h}"/>
    <g class="wm-compass" transform="translate(462,48)">
      <circle r="9"/><path d="M0,-12 L2.6,0 L0,2 L-2.6,0z" class="wm-compass-n"/><path d="M0,12 L2.6,0 L0,-2 L-2.6,0z"/>
      <text y="-14.5">N</text>
    </g>
    <g class="wm-stamp" transform="translate(${WM_SEA.x + 6},${WM_SEA.y + WM_SEA.h - 6})">
      <text>MOON CORE CARTOGRAPHIC SURVEY · 15 NATIONS</text>
    </g>
    <g class="wm-scale" transform="translate(${WM_SEA.x + WM_SEA.w - 66},${WM_SEA.y + WM_SEA.h - 9})">
      <path d="M0,0 h60 M0,-2.5 v5 M30,-1.5 v3 M60,-2.5 v5"/>
      <text x="30" y="6.5">SCALE ≈ 1 : 40,000,000</text>
    </g>
  </svg>`;
}

function wmPanelEmpty(){
  const seen = wmSeen();
  const ids = [...new Set(WM_SHAPES.map(s => s.id))];
  const list = ids.map(id => articleById(id)).filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
  return `
    <div class="wm-panel-head">
      <span class="wm-panel-kicker">SELECT NATION</span>
      <p class="wm-panel-hint">地図上の国をタップすると、ここに国家の概要が表示されます。</p>
    </div>
    <div class="wm-chips">
      ${list.map(a => `<button type="button" class="wm-chip${seen.has(a.id) ? ' is-explored' : ''}" data-id="${a.id}"
        style="--nc:${WM_SHAPES.find(s => s.id === a.id).color}"><i></i>${wmEsc(a.title)}</button>`).join('')}
    </div>`;
}

function wmPanelNation(id){
  const a = articleById(id);
  if(!a) return wmPanelEmpty();
  const rows = ['スローガン','首都','人口','政治体制']
    .map(k => [k, wmInfo(a, k)]).filter(r => r[1]);
  const explored = wmSeen().has(id);
  return `
    <div class="wm-panel-head">
      <span class="wm-panel-kicker">NATION FILE${explored ? ' · <b>探索済み</b>' : ''}</span>
      <button type="button" class="wm-close" aria-label="選択を解除">×</button>
    </div>
    <div class="wm-nation-title">
      ${a.flagUrl ? `<img class="wm-flag" src="${wmEsc(a.flagUrl)}" alt="${wmEsc(a.title)}の国旗">` : ''}
      <h2>${wmEsc(a.title)}</h2>
    </div>
    ${a.lede ? `<p class="wm-lede">${wmEsc(a.lede)}</p>` : ''}
    ${rows.length ? `<dl class="wm-facts">${rows.map(r => `<div><dt>${wmEsc(r[0])}</dt><dd>${wmEsc(r[1])}</dd></div>`).join('')}</dl>` : ''}
    <a class="wm-open" href="#/article/${a.id}">資料を開く <span aria-hidden="true">→</span></a>
    <p class="wm-panel-foot">地図上でもう一度タップしても開けます</p>`;
}

/* サイト全体のテーマ色を国の色に寄せる（theme.js と同じ考え方） */
function wmTint(id){
  const root = document.documentElement;
  const a = id ? articleById(id) : null;
  const c = a && a.accentColor ? a.accentColor : '#E0589A';
  const h = c.replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = .2126 * r + .7152 * g + .0722 * b;
  if(lum < 95){ const k = 95 / Math.max(lum, 1); r = Math.min(255, r * k); g = Math.min(255, g * k); b = Math.min(255, b * k); }
  if(lum > 225){ r *= .55; g *= .7; b *= .8; } // 白に近い色（チリルド）は地の白に溶けないよう沈める
  const hex = v => Math.round(v).toString(16).padStart(2, '0');
  const lift = v => v + (255 - v) * .45;
  root.style.setProperty('--theme', '#' + hex(r) + hex(g) + hex(b));
  root.style.setProperty('--theme-2', '#' + hex(lift(r)) + hex(lift(g)) + hex(lift(b)));
}

function mountWorldMap(host){
  if(!host) return;
  wmSelected = null;
  host.innerHTML = `
    <div class="wm-layout">
      <div class="wm-stage">
        <div class="wm-scroll">${wmBuildSvg()}</div>
        <div class="wm-tip" aria-hidden="true"></div>
        <div class="wm-swipe" aria-hidden="true">← スワイプで地図を移動 →</div>
      </div>
      <aside class="wm-panel" aria-live="polite"></aside>
    </div>`;

  const svg = host.querySelector('.wm-svg');
  const panel = host.querySelector('.wm-panel');
  const tip = host.querySelector('.wm-tip');
  const stage = host.querySelector('.wm-stage');
  const seen = wmSeen();

  host.querySelectorAll('.wm-nation').forEach(g => {
    if(seen.has(g.dataset.id)) g.classList.add('is-explored');
  });

  function sync(){
    svg.classList.toggle('has-selection', !!wmSelected);
    host.querySelectorAll('.wm-nation').forEach(g => {
      g.classList.toggle('is-selected', g.dataset.id === wmSelected);
      g.setAttribute('aria-pressed', g.dataset.id === wmSelected ? 'true' : 'false');
    });
    host.querySelectorAll('.wm-label').forEach(t => t.classList.toggle('is-selected', t.dataset.for === wmSelected));
    panel.innerHTML = wmSelected ? wmPanelNation(wmSelected) : wmPanelEmpty();
    panel.classList.toggle('is-open', !!wmSelected);
    if(wmSelected){
      const nc = (WM_SHAPES.find(s => s.id === wmSelected) || {}).color;
      panel.style.setProperty('--nc', nc);
      const n = parseInt(nc.slice(1), 16);
      const lum = .2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255);
      panel.classList.toggle('is-light', lum > 150);
    }
    wmTint(wmSelected);
  }

  function deselect(){
    wmSelected = null; sync();
    if(window.MCSound){ MCSound.play('back'); MCSound.focusNation(null); }
  }

  function select(id, fromMap){
    if(fromMap && id === wmSelected){ location.hash = '#/article/' + id; return; }
    wmSelected = id;
    sync();
    if(window.MCSound){
      const order = [...new Set(WM_SHAPES.map(x => x.id))];
      MCSound.play('select', order.indexOf(id));
      MCSound.focusNation(id);
    }
    // スマホではパネルが地図の下にあるので、見える位置まで送る
    if(id && window.matchMedia('(max-width: 900px)').matches){
      const r = panel.getBoundingClientRect();
      if(r.top > window.innerHeight * .75) panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
  }

  svg.addEventListener('click', e => {
    const g = e.target.closest('.wm-nation');
    if(g) select(g.dataset.id, true);
    else if(wmSelected){ deselect(); }
  });
  svg.addEventListener('keydown', e => {
    const g = e.target.closest('.wm-nation');
    if(g && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); select(g.dataset.id, true); }
    if(e.key === 'Escape' && wmSelected){ deselect(); }
  });

  // ホバー時の国名ツールチップ（マウスのみ）
  const finePointer = window.matchMedia && matchMedia('(hover:hover)').matches;
  if(finePointer){
    svg.addEventListener('pointermove', e => {
      const g = e.target.closest('.wm-nation');
      if(!g){ tip.classList.remove('is-on'); svg.classList.remove('has-hover'); return; }
      const a = articleById(g.dataset.id);
      tip.textContent = a ? a.title : g.dataset.id;
      const r = stage.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left) + 'px';
      tip.style.top = (e.clientY - r.top) + 'px';
      tip.style.setProperty('--nc', g.style.getPropertyValue('--nc'));
      tip.classList.add('is-on');
      host.querySelectorAll('.wm-label').forEach(t => t.classList.toggle('is-hover', t.dataset.for === g.dataset.id));
    });
    svg.addEventListener('pointerleave', () => {
      tip.classList.remove('is-on');
      host.querySelectorAll('.wm-label.is-hover').forEach(t => t.classList.remove('is-hover'));
    });
  }

  panel.addEventListener('click', e => {
    const chip = e.target.closest('.wm-chip');
    if(chip){ select(chip.dataset.id, false); return; }
    if(e.target.closest('.wm-close')){ deselect(); }
  });

  // スマホ：地図を中央から見せ、動かしたらスワイプ案内を消す
  const scroller = host.querySelector('.wm-scroll');
  const swipe = host.querySelector('.wm-swipe');
  requestAnimationFrame(() => {
    if(scroller.scrollWidth > scroller.clientWidth){
      scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
    }
  });
  scroller.addEventListener('scroll', () => swipe.classList.add('is-gone'), { once:true, passive:true });

  sync();
}
