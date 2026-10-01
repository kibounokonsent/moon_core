/* =====================================================================
   テーマカラー切り替え：カテゴリー／国家ごとに、サイト全体の色が変わる
   --theme（主色）と --theme-2（発光色）を :root に設定する。
   ===================================================================== */
(function(){
  const root = document.documentElement;
  const DEFAULT = { c:'#1F6BFF', c2:'#22E4FF' };

  const CAT_COLOR = {
    world:'#22D3EE', history:'#E0B36A', life:'#4FE3C1', tech:'#2F8CFF',
    substance:'#A78BFA', nation:'#E0589A', creature:'#4ADE80', org:'#7DB4FF',
    mutant:'#FF4D4D', culture:'#FFD23F', law:'#8B95FF', glossary:'#C7D2E0'
  };

  function hexToRgb(h){
    h = h.replace('#','');
    if(h.length === 3) h = h.split('').map(x => x+x).join('');
    const n = parseInt(h, 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }
  function lift(hex, amt){
    const [r,g,b] = hexToRgb(hex);
    const f = v => Math.round(v + (255 - v) * amt).toString(16).padStart(2,'0');
    return '#' + f(r) + f(g) + f(b);
  }
  // 暗すぎる色（#690000 など）は黒背景で光らないため、明るさの下限を設ける
  function ensureVisible(hex){
    const [r,g,b] = hexToRgb(hex);
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    if(lum >= 95) return hex;
    const k = 95 / Math.max(lum, 1);          // 色相を保ったまま明るさだけ持ち上げる
    const f = v => Math.min(255, Math.round(v * k)).toString(16).padStart(2,'0');
    return '#' + f(r) + f(g) + f(b);
  }

  function apply(color, color2){
    root.style.setProperty('--theme', color);
    root.style.setProperty('--theme-2', color2);
  }
  function applyFor(color){
    if(!color){ apply(DEFAULT.c, DEFAULT.c2); return; }
    const c = ensureVisible(color);
    apply(c, lift(c, 0.45));
  }

  function colorForHash(hash){
    let m;
    if((m = hash.match(/^#\/category\/([^/?#]+)/))) return CAT_COLOR[m[1]] || null;
    if((m = hash.match(/^#\/article\/([^/?#]+)/))){
      const a = (typeof articleById === 'function') ? articleById(m[1]) : null;
      if(!a) return null;
      if(a.cat === 'nation' && a.accentColor) return a.accentColor;
      return CAT_COLOR[a.cat] || null;
    }
    return null;
  }

  function settle(){ applyFor(colorForHash(location.hash)); }

  // ホバーで色を先読み表示（カテゴリーカード・国家タイル・記事カードなど）
  const finePointer = window.matchMedia && matchMedia('(hover:hover)').matches;
  if(finePointer){
    document.addEventListener('mouseover', e => {
      const a = e.target.closest && e.target.closest('a[href^="#/category/"], a[href^="#/article/"]');
      if(!a) return;
      const col = colorForHash(a.getAttribute('href'));
      if(col) applyFor(col);
    });
    document.addEventListener('mouseout', e => {
      const a = e.target.closest && e.target.closest('a[href^="#/category/"], a[href^="#/article/"]');
      if(!a || (e.relatedTarget && a.contains(e.relatedTarget))) return;
      settle();
    });
  }

  window.addEventListener('hashchange', () => setTimeout(settle, 30));

  // 初期テーマ：未設定ならライト（白）。切り替えは記憶する。
  let saved = null;
  try { saved = localStorage.getItem('moonCoreTheme'); } catch(e){}
  const initial = saved || 'light';
  root.setAttribute('data-theme', initial);
  function syncLogo(){
    const logo = document.getElementById('hero-logo');
    if(logo) logo.src = root.getAttribute('data-theme') === 'dark' ? 'assets/mooncore4.svg' : 'assets/mooncore3.svg';
  }
  syncLogo();

  if(typeof window.toggleTheme === 'function'){
    const orig = window.toggleTheme;
    window.toggleTheme = function(){
      orig();
      try { localStorage.setItem('moonCoreTheme', root.getAttribute('data-theme')); } catch(e){}
    };
  }

  window.addEventListener('load', () => { syncLogo(); settle(); });
  settle();
})();
