/* =====================================================================
   探索演出：未来世界を「冒険している」感覚を作る
   - 初回の起動シーケンス（1回／セッション、クリックでスキップ）
   - 現在地と探索率のHUD（読んだ記事を記憶）
   - 探索済みの印、カテゴリーの探索メーター
   - ページ移動時のスキャン、タイトルのデコード表示
   - ヒーローの浮遊粒子とマウス視差
   すべて prefers-reduced-motion では動きを止める。
   ===================================================================== */
(function(){
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'moonCoreExplored';

  /* ---------- 探索記録 ---------- */
  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch(e){}
  function save(){ try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch(e){} }

  function articleIdFromHash(h){ const m = h.match(/^#\/article\/([^/?#]+)/); return m ? m[1] : null; }
  function catKeyFromHash(h){ const m = h.match(/^#\/category\/([^/?#]+)/); return m ? m[1] : null; }
  const total = () => ARTICLES.length;

  /* ---------- HUD ---------- */
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = '<span class="hud-label">現在地</span><span class="hud-loc"></span><span class="hud-sep"></span><span class="hud-label">探索</span><span class="hud-rate"></span><span class="hud-bar"><i></i></span>';
  document.body.appendChild(hud);
  const hudLoc = hud.querySelector('.hud-loc');
  const hudRate = hud.querySelector('.hud-rate');
  const hudBar = hud.querySelector('.hud-bar i');

  function locationText(){
    const h = location.hash;
    const aid = articleIdFromHash(h);
    if(aid){
      const a = articleById(aid);
      if(a){ const c = catByKey(a.cat); return (c ? c.name + ' / ' : '') + a.title; }
    }
    const ck = catKeyFromHash(h);
    if(ck){ const c = catByKey(ck); if(c) return c.name; }
    if(h === '' || h === '#/' || h === '#') return 'ホーム';
    if(h.startsWith('#/calendar')) return 'カレンダー';
    if(h === '#/articles') return '全記事一覧';
    if(h === '#/world-map') return '世界地図';
    return null;
  }

  function updateHud(){
    const t = locationText();
    if(t !== null) hudLoc.textContent = t;
    hudRate.textContent = seen.size + ' / ' + total();
    hudBar.style.width = Math.min(100, seen.size / total() * 100).toFixed(1) + '%';
  }

  /* ---------- 探索済みの印とメーター ---------- */
  function decorate(){
    document.querySelectorAll('#app a[href^="#/article/"]').forEach(a => {
      const id = articleIdFromHash(a.getAttribute('href'));
      if(id && seen.has(id)) a.classList.add('is-explored');
    });
    document.querySelectorAll('#app .cat-card').forEach(card => {
      const key = catKeyFromHash(card.getAttribute('href'));
      const c = catByKey(key);
      if(!c || c.renderMode === 'glossary') return;
      const ids = articlesInCat(key).map(a => a.id);
      if(!ids.length) return;
      const done = ids.filter(id => seen.has(id)).length;
      card.style.setProperty('--fill', (done / ids.length).toFixed(3));
      const cnt = card.querySelector('.cat-count');
      if(cnt) cnt.textContent = ids.length + '項目　探索済み ' + done;
    });
  }

  /* ---------- タイトルのデコード表示 ---------- */
  const GLYPHS = '01ｱｲｳｴｵｶｷｸｹｺ<>/=+*#';
  function decode(el){
    if(reduce || !el) return;
    const text = el.textContent.trim();
    if(!text || text.length > 40) return;
    el.setAttribute('aria-label', text);
    const start = performance.now(), dur = 520;
    (function frame(now){
      const p = Math.min(1, (now - start) / dur);
      const keep = Math.floor(text.length * p);
      let out = text.slice(0, keep);
      for(let i = keep; i < text.length; i++){
        out += /\s/.test(text[i]) ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if(p < 1) requestAnimationFrame(frame); else el.textContent = text;
    })(start);
  }

  /* ---------- スキャン演出 ---------- */
  function scan(){
    if(reduce) return;
    const s = document.createElement('div');
    s.className = 'scan';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }

  /* ---------- 起動シーケンス後に実行する処理 ---------- */
  let bootActive = false;
  const afterBootQueue = [];
  function afterBoot(fn){ if(bootActive) afterBootQueue.push(fn); else fn(); }

  /* ---------- 資料が組み上がる演出 ---------- */
  function assemble(){
    if(reduce) return;
    const groups = [
      ['#app .breadcrumb, #app .cat-badge, #app .title-block .lede, #app .meta-row', 0, 8],
      ['#app .toc-list a', 3, 12],
      ['#app .content-card > *', 5, 18],
      ['#app .featured-card, #app .article-card, #app .update-row, #app .cat-note', 4, 14],
      ['#app .glossary-item', 3, 12]
    ];
    groups.forEach(([sel, base, cap]) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        if(i >= cap) return;
        el.classList.remove('asm'); void el.offsetWidth;
        el.style.setProperty('--i', base + i);
        el.classList.add('asm');
        el.addEventListener('animationend', () => el.classList.remove('asm'), {once:true});
      });
    });
  }

  /* ---------- 画面遷移ごとの処理 ---------- */
  let first = true;
  function onRoute(){
    const aid = articleIdFromHash(location.hash);
    if(aid && articleById(aid)){ seen.add(aid); save(); }
    updateHud();
    decorate();
    if(location.hash === '' || location.hash.startsWith('#/')){
      if(!first) scan();
      afterBoot(() => {
        decode(document.querySelector('#app .title-block h1'));
        assemble();
      });
    }
    first = false;
  }
  window.addEventListener('hashchange', () => setTimeout(onRoute, 40));

  /* ---------- 起動シーケンス ---------- */
  function boot(){
    let done = false;
    try { done = sessionStorage.getItem('moonCoreBooted') === '1'; } catch(e){}
    if(done || reduce) return;
    try { sessionStorage.setItem('moonCoreBooted', '1'); } catch(e){}
    const el = document.createElement('div');
    el.id = 'boot';
    el.innerHTML =
      '<svg class="boot-ring" viewBox="0 0 200 200" aria-hidden="true">' +
        '<circle cx="100" cy="100" r="92"/><circle class="b2" cx="100" cy="100" r="70"/><circle class="b3" cx="100" cy="100" r="48"/>' +
        '<circle class="bsat" cx="100" cy="8" r="3"/></svg>' +
      '<div class="boot-text"><div class="boot-title">MOON CORE ARCHIVE</div>' +
      '<div class="boot-line" id="boot-line">未来世界に接続しています</div>' +
      '<div class="boot-bar"><i></i></div><div class="boot-skip">クリックでスキップ</div></div>';
    document.body.appendChild(el);
    bootActive = true;
    const lines = ['未来世界に接続しています', '資料を展開しています', '準備が整いました'];
    let i = 0;
    const iv = setInterval(() => {
      i = Math.min(i + 1, lines.length - 1);
      const l = document.getElementById('boot-line'); if(l) l.textContent = lines[i];
    }, 600);
    function close(){
      clearInterval(iv);
      if(!bootActive) return;
      bootActive = false;
      el.classList.add('out');
      setTimeout(() => el.remove(), 600);
      afterBootQueue.splice(0).forEach(fn => fn());
    }
    el.addEventListener('click', close);
    setTimeout(close, 1900);
  }

  /* ---------- ヒーローの粒子と視差 ---------- */
  function heroFx(){
    const hero = document.querySelector('.hero');
    const cv = document.getElementById('hero-particles');
    if(!hero || !cv || reduce) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, pts = [];
    function size(){
      const r = hero.getBoundingClientRect();
      w = cv.width = Math.max(1, r.width); h = cv.height = Math.max(1, r.height);
      pts = Array.from({length: Math.round(Math.min(70, w / 20))}, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.3 + .4, v: Math.random() * .12 + .03, t: Math.random() * 6.28
      }));
    }
    size(); window.addEventListener('resize', size);
    function tick(){
      requestAnimationFrame(tick);
      if(document.hidden || hero.offsetParent === null) return;
      const col = getComputedStyle(root).getPropertyValue('--theme-2').trim() || '#22E4FF';
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = col;
      for(const p of pts){
        p.y -= p.v; p.t += .02;
        if(p.y < -4){ p.y = h + 4; p.x = Math.random() * w; }
        ctx.globalAlpha = .25 + .35 * (Math.sin(p.t) * .5 + .5);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    tick();
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
  }

  /* ---------- 背景を流れるデータ ---------- */
  function dataStream(){
    const host = document.querySelector('.bg-canvas');
    if(!host || reduce) return;
    const cv = document.createElement('canvas');
    cv.className = 'data-stream';
    host.insertBefore(cv, host.children[1] || null);
    const ctx = cv.getContext('2d');
    // 文字は、この世界の記事タイトルから集める
    const pool = Array.from(new Set(ARTICLES.map(a => a.title).join('').replace(/[\s（）()「」・]/g, '').split('').concat('0123456789ABCDEF'.split('')))).join('');
    const FS = 13, GAP = 56;
    let w = 0, h = 0, cols = [];
    function size(){
      w = cv.width = window.innerWidth; h = cv.height = window.innerHeight;
      cols = Array.from({length: Math.ceil(w / GAP)}, (_, i) => ({
        x: i * GAP + 14, y: Math.random() * -h, v: .5 + Math.random() * 1.1,
        n: 8 + Math.floor(Math.random() * 10),
        s: Array.from({length: 22}, () => pool[Math.floor(Math.random() * pool.length)])
      }));
    }
    size(); window.addEventListener('resize', size);
    let last = 0;
    function tick(now){
      requestAnimationFrame(tick);
      if(document.hidden || now - last < 50) return;
      last = now;
      const col = getComputedStyle(root).getPropertyValue('--theme-2').trim() || '#22E4FF';
      ctx.clearRect(0, 0, w, h);
      ctx.font = FS + 'px "IBM Plex Sans JP", monospace';
      ctx.fillStyle = col;
      for(const c of cols){
        c.y += c.v * 3;
        if(c.y - c.n * FS > h){ c.y = Math.random() * -200; c.v = .5 + Math.random() * 1.1; c.n = 8 + Math.floor(Math.random() * 10); }
        for(let k = 0; k < c.n; k++){
          const y = c.y - k * FS;
          if(y < -FS || y > h + FS) continue;
          ctx.globalAlpha = (k === 0 ? .9 : .42) * (1 - k / c.n);
          if(Math.random() < .015) c.s[k % c.s.length] = pool[Math.floor(Math.random() * pool.length)];
          ctx.fillText(c.s[k % c.s.length], c.x, y);
        }
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('load', () => { onRoute(); heroFx(); dataStream(); });
  boot();
  updateHud();
})();
