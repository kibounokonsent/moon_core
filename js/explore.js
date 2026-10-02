/* =====================================================================
   探索演出：未来世界を「冒険している」感覚を作る
   - 起動シーケンス（1回／セッション）。準備が整うまで中身は一切見せない
   - 画面移動のたびに、資料が組み上がる（描画前に初期状態を設定するのでちらつかない）
   - 現在地と探索率のHUD、探索済みの印、カテゴリーの探索メーター
   - 背景を流れるデータ：いま見ている記事・カテゴリーの言葉が流れる
   - ヒーローの浮遊粒子とマウス視差
   すべて prefers-reduced-motion では動きを止める。
   ===================================================================== */
(function(){
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'moonCoreExplored';
  const isRoute = h => h === '' || h === '#' || h.startsWith('#/');

  /* ---------- 探索記録 ---------- */
  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch(e){}
  function save(){ try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch(e){} }
  const articleIdFromHash = h => { const m = h.match(/^#\/article\/([^/?#]+)/); return m ? m[1] : null; };
  const catKeyFromHash = h => { const m = h.match(/^#\/category\/([^/?#]+)/); return m ? m[1] : null; };

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
    if(aid){ const a = articleById(aid); if(a){ const c = catByKey(a.cat); return (c ? c.name + ' / ' : '') + a.title; } }
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
    hudRate.textContent = seen.size + ' / ' + ARTICLES.length;
    hudBar.style.width = Math.min(100, seen.size / ARTICLES.length * 100).toFixed(1) + '%';
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
      for(let i = keep; i < text.length; i++) out += /\s/.test(text[i]) ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      el.textContent = out;
      if(p < 1) requestAnimationFrame(frame); else el.textContent = text;
    })(start);
  }

  /* ---------- 資料が組み上がる演出 ---------- */
  const GROUPS = [
    ['#home-hero .hero-inner > *', 0, 8],
    ['#app .breadcrumb, #app .cat-badge, #app .title-block .lede, #app .meta-row', 0, 8],
    ['#app .toc-list a', 3, 12],
    ['#app .content-card > *', 5, 18],
    ['#app .featured-card, #app .article-card, #app .update-row, #app .cat-note', 4, 14],
    ['#app .glossary-item', 3, 12]
  ];
  function assemble(){
    if(reduce) return;
    GROUPS.forEach(([sel, base, cap]) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        if(i >= cap) return;
        el.classList.remove('asm'); void el.offsetWidth;
        el.style.setProperty('--i', base + i);
        el.classList.add('asm');
        el.addEventListener('animationend', () => el.classList.remove('asm'), {once:true});
      });
    });
  }
  function playIn(){
    assemble();
    decode(document.querySelector('#app .title-block h1'));
  }

  /* ---------- スキャン演出 ---------- */
  function scan(){
    if(reduce) return;
    const s = document.createElement('div');
    s.className = 'scan';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }

  /* ---------- 背景を流れるデータ：いまの記事・カテゴリーの言葉 ---------- */
  const stream = (function(){
    const host = document.querySelector('.bg-canvas');
    if(!host || reduce) return { setContext(){} };
    const cv = document.createElement('canvas');
    cv.className = 'data-stream';
    host.insertBefore(cv, host.children[1] || null);
    const ctx = cv.getContext('2d');
    const FS = 13, GAP = 54;
    const HEX = '0123456789ABCDEF';
    let words = [], w = 0, h = 0, cols = [];

    const clip = (s, n) => (s || '').replace(/[\s（）()「」『』・、。]/g, '').slice(0, n);
    function allWords(){
      return ARTICLES.map(a => clip(a.title, 8)).concat(CATEGORIES.map(c => clip(c.name, 8))).filter(Boolean);
    }
    function contextWords(){
      const hsh = location.hash;
      const aid = articleIdFromHash(hsh);
      const ck = catKeyFromHash(hsh);
      let list = [];
      if(aid && articleById(aid)){
        const a = articleById(aid);
        list.push(clip(a.title, 8));
        (a.sections || []).forEach(s => list.push(clip(s.title, 8)));
        (a.keywords || []).forEach(k => list.push(clip(k, 8)));
        (typeof autoRelatedIds === 'function' ? autoRelatedIds(a) : (a.related || [])).forEach(id => {
          const r = articleById(id); if(r) list.push(clip(r.title, 8));
        });
        const c = catByKey(a.cat); if(c) list.push(clip(c.name, 8));
        // 記事の概要文からも、短い語句を拾う
        (a.lede || '').split(/[、。・]/).forEach(p => { const t = clip(p, 8); if(t.length >= 2) list.push(t); });
      } else if(ck && catByKey(ck)){
        const c = catByKey(ck);
        list.push(clip(c.name, 8));
        articlesInCat(ck).forEach(a => list.push(clip(a.title, 8)));
        if(c.renderMode === 'glossary') GLOSSARY.forEach(g => list.push(clip(g.term, 8)));
      }
      list = list.filter(Boolean);
      // 文脈語を主役にしつつ、世界全体の言葉を少し混ぜる
      return list.length >= 3 ? list.concat(allWords().filter((_, i) => i % 30 === 0)) : allWords();
    }
    function pick(){
      if(Math.random() < .22){
        let s = ''; for(let i = 0; i < 6; i++) s += HEX[Math.floor(Math.random() * 16)];
        return s;
      }
      return words[Math.floor(Math.random() * words.length)] || '0000';
    }
    function fresh(c, offscreen){
      c.text = pick();
      c.y = offscreen ? -Math.random() * h * .6 : Math.random() * h;
      c.v = .5 + Math.random() * 1.1;
    }
    function size(){
      w = cv.width = window.innerWidth; h = cv.height = window.innerHeight;
      cols = Array.from({length: Math.ceil(w / GAP)}, (_, i) => { const c = { x: i * GAP + 14 }; fresh(c, true); return c; });
    }
    words = allWords();
    size(); window.addEventListener('resize', size);

    let last = 0;
    function tick(now){
      requestAnimationFrame(tick);
      if(document.hidden || now - last < 50) return;
      last = now;
      const col = getComputedStyle(root).getPropertyValue('--theme-2').trim() || '#22E4FF';
      ctx.clearRect(0, 0, w, h);
      ctx.font = FS + 'px "IBM Plex Sans JP", "Noto Sans JP", monospace';
      ctx.fillStyle = col;
      for(const c of cols){
        c.y += c.v * 3;
        const n = c.text.length;
        if(c.y - n * FS > h) fresh(c, true);
        for(let k = 0; k < n; k++){
          const y = c.y - (n - 1 - k) * FS;          // 言葉は上から下へ読める。先頭（最後の文字）が最も明るい
          if(y < -FS || y > h + FS) continue;
          ctx.globalAlpha = .18 + .72 * ((k + 1) / n) * ((k + 1) / n);
          ctx.fillText(c.text[k], c.x, y);
        }
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(tick);

    return {
      setContext(){
        words = contextWords();
        // 画面が変わったら、流れている言葉の大半をすぐ新しい言葉に入れ替える
        cols.forEach(c => { if(Math.random() < .75) c.text = pick(); });
      }
    };
  })();

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
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + .4, v: Math.random() * .12 + .03, t: Math.random() * 6.28
      }));
    }
    size(); window.addEventListener('resize', size);
    (function tick(){
      requestAnimationFrame(tick);
      if(document.hidden || hero.offsetParent === null) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(root).getPropertyValue('--theme-2').trim() || '#22E4FF';
      for(const p of pts){
        p.y -= p.v; p.t += .02;
        if(p.y < -4){ p.y = h + 4; p.x = Math.random() * w; }
        ctx.globalAlpha = .25 + .35 * (Math.sin(p.t) * .5 + .5);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    })();
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
  }

  /* ---------- 画面が切り替わった瞬間（描画の前）に初期状態を作る ---------- */
  let lastHash = location.hash;
  const app = document.getElementById('app');
  new MutationObserver(() => {
    decorate();
    const h = location.hash;
    if(!isRoute(h)) return;
    const aid = articleIdFromHash(h);
    if(aid && articleById(aid) && !seen.has(aid)){ seen.add(aid); save(); }
    updateHud();
    decorate();
    if(h === lastHash) return;
    lastHash = h;
    if(root.classList.contains('booting')) return;
    stream.setContext();
    scan();
    playIn();
  }).observe(app, { childList: true });
  window.addEventListener('hashchange', () => setTimeout(updateHud, 40));

  /* ---------- 起動：準備が整ってから、最初の画面を組み上げる ---------- */
  function ungate(){ root.classList.remove('gate'); }

  function start(){
    const aid = articleIdFromHash(location.hash);
    if(aid && articleById(aid)){ seen.add(aid); save(); }
    updateHud(); decorate();
    stream.setContext();
    heroFx();
  }

  function runBoot(el){
    el.classList.add('show');
    try { sessionStorage.setItem('moonCoreBooted', '1'); } catch(e){}
    const lines = ['未来世界に接続しています', '資料を展開しています', '準備が整いました'];
    const lineEl = document.getElementById('boot-line');
    let i = 0;
    const iv = setInterval(() => { i = Math.min(i + 1, lines.length - 1); if(lineEl) lineEl.textContent = lines[i]; }, 620);

    let closed = false;
    function close(){
      if(closed) return; closed = true;
      clearInterval(iv);
      // 先にゲートを外す：中身は .asm の初期状態（透明）で現れ、組み上がっていく
      assemble();
      root.classList.remove('booting');
      ungate();
      el.classList.add('out');
      decode(document.querySelector('#app .title-block h1'));
      setTimeout(() => { el.classList.remove('show'); el.remove(); }, 650);
    }
    el.addEventListener('click', close);

    const minWait = new Promise(r => setTimeout(r, 1800));
    const loaded = new Promise(r => { if(document.readyState === 'complete') r(); else window.addEventListener('load', r, {once:true}); });
    const fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    Promise.all([minWait, loaded, fonts]).then(close);
    setTimeout(close, 4200);                    // 何があっても4秒強で開く
  }

  start();
  const bootEl = document.getElementById('boot');
  if(root.classList.contains('booting') && bootEl && !reduce){
    runBoot(bootEl);
  } else {
    if(bootEl) bootEl.remove();
    root.classList.remove('booting');
    assemble();                                  // 隠れている間に初期状態（透明）を作ってから表示する
    ungate();
    decode(document.querySelector('#app .title-block h1'));
  }
})();
