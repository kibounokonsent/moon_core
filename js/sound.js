/* =====================================================================
   MOON CORE サウンド
   - 音声ファイルは使わず、Web Audio API でその場で合成する（軽い・差し替え不要）
   - 効果音：タップ、資料を開く、カテゴリー移動、地図で国を選ぶ、閉じる
   - 環境音：ページや国ごとに切り替わる（森の風、遠い海、雪、空、時計…）
   - ヘッダーのスピーカーボタンから「効果音」「環境音」を個別にオン／オフ
   - ブラウザの決まりで、最初のタップ／クリックまでは音が出ない
   ===================================================================== */
(function(){
  const KEY = 'moonCoreSound';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 設定（既定：効果音オン・環境音オン） ----
  let prefs = { sfx:true, amb:true, vol:.7 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e){}
  function savePrefs(){ try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch(e){} }

  let ctx = null, master, sfxBus, ambBus, comp, noiseWhite, noisePink, noiseBrown;
  let unlocked = false;

  /* ---------------- 下準備 ---------------- */
  function makeNoise(kind){
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
    for(let i = 0; i < len; i++){
      const w = Math.random() * 2 - 1;
      if(kind === 'white'){ d[i] = w * .5; }
      else if(kind === 'pink'){
        b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852;
        b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898;
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926;
      } else { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
    }
    return buf;
  }

  function init(){
    if(ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = prefs.vol;
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? .9 : 0;
    ambBus = ctx.createGain(); ambBus.gain.value = prefs.amb ? .8 : 0;
    sfxBus.connect(master); ambBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    noiseWhite = makeNoise('white'); noisePink = makeNoise('pink'); noiseBrown = makeNoise('brown');
    return true;
  }

  function unlock(){
    if(!init()) return;
    if(ctx.state === 'suspended') ctx.resume();
    if(!unlocked){ unlocked = true; updateAmbience(true); }
  }
  ['pointerdown','keydown','touchend'].forEach(ev =>
    window.addEventListener(ev, unlock, { capture:true, passive:true }));

  document.addEventListener('visibilitychange', () => {
    if(!ctx) return;
    if(document.hidden) ctx.suspend(); else if(unlocked) ctx.resume();
  });

  /* ---------------- 部品 ---------------- */
  const now = () => ctx.currentTime;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // 柔らかい単音（ガラスのような明るい音）
  function tone(freq, t, dur, vol, type, bus, opts){
    opts = opts || {};
    const o = ctx.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if(opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, t + dur * .6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + (opts.attack || .006));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node = o;
    if(opts.pan !== undefined && ctx.createStereoPanner){
      const p = ctx.createStereoPanner(); p.pan.value = opts.pan; o.connect(p); node = p;
    }
    node.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + .05);
    return g;
  }

  // ノイズの一吹き（シュッという音）
  function whoosh(t, dur, vol, from, to, bus){
    const s = ctx.createBufferSource(); s.buffer = noiseWhite;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * 3); s.stop(t + dur + .05);
  }

  // 短い残響（エコー）付きの出口
  function echoBus(time, fb, wet){
    const inG = ctx.createGain();
    const d = ctx.createDelay(1); d.delayTime.value = time;
    const f = ctx.createGain(); f.gain.value = fb;
    const w = ctx.createGain(); w.gain.value = wet;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    inG.connect(sfxBus); inG.connect(d); d.connect(lp); lp.connect(f); f.connect(d); lp.connect(w); w.connect(sfxBus);
    setTimeout(() => { try { inG.disconnect(); d.disconnect(); } catch(e){} }, 4000);
    return inG;
  }

  /* ---------------- 効果音 ---------------- */
  let lastTap = 0, lastHover = 0;
  const SFX = {
    tap(){
      const t = now(); if(t - lastTap < .04) return; lastTap = t;
      tone(1568, t, .09, .11, 'sine', null, { glide:2093 });
      tone(3136, t, .05, .025, 'sine');
    },
    hover(){ // 触れたとき：ごく小さな2音の光
      const t = now(); if(t - lastHover < .06) return; lastHover = t;
      tone(2637, t, .05, .016, 'sine');
      tone(3951, t + .018, .05, .009, 'sine');
    },
    hoverMap(){ // 地図の国に触れたとき：少し低い柔らかな音
      const t = now(); if(t - lastHover < .06) return; lastHover = t;
      tone(1318, t, .12, .02, 'sine', null, { glide:1568 });
    },
    open(){ // 資料が開く：上昇するガラスのアルペジオ＋シュッ
      const t = now() + .01;
      const out = echoBus(.16, .32, .35);
      [72, 76, 79, 84, 88].forEach((m, i) =>
        tone(mtof(m), t + i * .055, .55 - i * .04, .07, i % 2 ? 'triangle' : 'sine', out, { pan:(i - 2) * .2 }));
      whoosh(t, .45, .05, 600, 5200);
    },
    page(){ // カテゴリー・一覧への移動：軽い2音
      const t = now() + .01;
      const out = echoBus(.12, .2, .25);
      tone(mtof(79), t, .22, .06, 'sine', out);
      tone(mtof(86), t + .06, .3, .05, 'triangle', out);
      whoosh(t, .3, .025, 900, 3800);
    },
    back(){
      const t = now() + .01;
      tone(mtof(84), t, .14, .05, 'sine');
      tone(mtof(79), t + .06, .2, .045, 'sine');
    },
    select(i){ // 地図で国を選ぶ：国ごとに音程が変わる
      const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103, 105];
      const m = scale[(i || 0) % scale.length];
      const t = now() + .01;
      const out = echoBus(.18, .3, .4);
      tone(mtof(m), t, .7, .08, 'sine', out);
      tone(mtof(m + 7), t + .04, .55, .035, 'triangle', out);
      tone(mtof(m + 12), t + .08, .4, .02, 'sine', out);
    },
    toggleOn(){
      const t = now() + .01;
      tone(mtof(76), t, .15, .06, 'sine'); tone(mtof(83), t + .07, .25, .06, 'sine');
    }
  };

  function play(name, arg){
    if(!ctx || !unlocked || !prefs.sfx) return;
    try { SFX[name] && SFX[name](arg); } catch(e){}
  }

  /* ---------------- 環境音 ---------------- */
  // 各環境音は { out:GainNode, stop() } を返す。out はフェードイン／アウトに使う。
  function loopNoise(buf){
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    s.start(now(), Math.random() * 3);
    return s;
  }
  function lfo(rate, depth, target, type){
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = rate;
    const g = ctx.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(target); o.start();
    return o;
  }
  function pad(notes, out, vol, filterHz){ // ゆっくり揺れる明るい和音
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filterHz || 1400; lp.Q.value = .3;
    const g = ctx.createGain(); g.gain.value = vol;
    lp.connect(g); g.connect(out);
    const nodes = [lfo(.05, (filterHz || 1400) * .35, lp.frequency)];
    notes.forEach((m, i) => {
      [-4, 4].forEach(det => {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = mtof(m); o.detune.value = det + Math.random() * 3;
        const og = ctx.createGain(); og.gain.value = .5 / notes.length;
        o.connect(og); og.connect(lp); o.start(); nodes.push(o);
        nodes.push(lfo(.07 + Math.random() * .08, .18 / notes.length, og.gain));
      });
    });
    return nodes;
  }
  function wind(out, opts){ // 風：ピンクノイズを帯域で絞り、ゆっくり強弱
    const s = loopNoise(opts.brown ? noiseBrown : noisePink);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = opts.freq || 700; bp.Q.value = opts.q || .7;
    const g = ctx.createGain(); g.gain.value = opts.vol || .3;
    s.connect(bp); bp.connect(g); g.connect(out);
    return [s,
      lfo(opts.rate || .07, (opts.freq || 700) * (opts.sweep || .45), bp.frequency),
      lfo((opts.rate || .07) * 1.7, (opts.vol || .3) * .55, g.gain)];
  }
  function every(minS, maxS, fn, timers){
    let alive = true;
    (function next(){
      const id = setTimeout(() => { if(!alive) return; try { fn(); } catch(e){} next(); }, (minS + Math.random() * (maxS - minS)) * 1000);
      timers.push(id);
    })();
    return () => { alive = false; };
  }

  /* ---- 情景音の部品 ---- */
  // 金属・ガラスの打音（非整数倍音で「カン」「チン」）
  function hit(t, freq, out, vol, decay, ratios, pan){
    (ratios || [1, 2.76, 5.4]).forEach((r, i) => {
      tone(freq * r, t, decay / (1 + i * .6), vol / (1 + i * 1.3), 'sine', out, { attack:.001, pan });
    });
  }
  // 短いノイズの粒（カチッ、コツッ、ザッ）
  function click(t, out, vol, hz, q, dur, pan){
    const s = ctx.createBufferSource(); s.buffer = noiseWhite;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q || 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node = g;
    if(pan !== undefined && ctx.createStereoPanner){ const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    s.connect(f); f.connect(g); node.connect(out);
    s.start(t, Math.random() * 3); s.stop(t + dur + .02);
  }
  // 鳴りっぱなしのノイズ床
  function bed(out, buf, type, hz, q, vol){
    const s = loopNoise(buf);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(out);
    return { nodes:[s], f, g };
  }
  // 遠くの人のざわめき（ノイズに声の帯域を持たせて揺らす）
  function murmur(out, vol){
    const nodes = [];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const g = ctx.createGain(); g.gain.value = vol; lp.connect(g); g.connect(out);
    [[520, 5], [1250, 6], [2300, 7]].forEach(([hz, q]) => {
      const s = loopNoise(noisePink);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q;
      const vg = ctx.createGain(); vg.gain.value = .5;
      s.connect(f); f.connect(vg); vg.connect(lp);
      nodes.push(s, lfo(2.5 + Math.random() * 3, hz * .18, f.frequency), lfo(1.3 + Math.random() * 2, .3, vg.gain));
    });
    nodes.push(lfo(.08, vol * .35, g.gain));
    return nodes;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---- 常に流れる背景：明るいSFの空気 ---- */
  function startBase(){
    const out = ctx.createGain(); out.gain.value = 0; out.connect(ambBus);
    const T = { timers:[], stops:[] };
    const nodes = pad([60, 67, 71, 76], out, .16, 1200);
    T.stops.push(every(6, 13, () => { // ときどき光る高い音
      const m = pick([84, 86, 88, 91, 93]);
      tone(mtof(m), now(), 2.4, .012, 'sine', out, { attack:.25, pan:rnd(-.6, .6) });
    }, T.timers));
    out.gain.linearRampToValueAtTime(1, now() + 2.5);
    return { out, stop(){ stopLayer(out, nodes, T); } };
  }
  function stopLayer(out, nodes, T){
    T.stops.forEach(f => f()); T.timers.forEach(clearTimeout);
    const t = now();
    out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 1.6);
    setTimeout(() => { nodes.forEach(n => { try { n.stop && n.stop(); } catch(e){} }); try { out.disconnect(); } catch(e){} }, 1900);
  }

  /* ---- ページごとの情景音（背景の上に重なる） ---- */
  const SCENE = {
    // 森：やさしい風、葉ずれ、小鳥
    forest(out, T){
      const n = wind(out, { freq:650, q:.6, vol:.26, rate:.06 });
      const l = bed(out, noiseWhite, 'bandpass', 5200, .9, .02);
      n.push(...l.nodes, lfo(.11, .016, l.g.gain), lfo(.37, .007, l.g.gain));
      T.stops.push(every(3.5, 9, () => {
        const t = now(), base = rnd(2600, 4000), pan = rnd(-.7, .7), k = 2 + Math.floor(Math.random() * 3);
        for(let i = 0; i < k; i++) tone(base * rnd(1, 1.15), t + i * .11, .09, .022, 'sine', out, { glide:base * 1.35, pan, attack:.01 });
      }, T.timers));
      return n;
    },
    // 海：遠くで寄せては返す波
    sea(out, T){
      const a = bed(out, noiseBrown, 'lowpass', 520, .4, .3);
      const b = bed(out, noisePink, 'bandpass', 1800, .6, .03);
      return [...a.nodes, ...b.nodes, lfo(.11, .24, a.g.gain), lfo(.11, 260, a.f.frequency), lfo(.11, .026, b.g.gain)];
    },
    // 氷：澄んだ氷の粒、ときどき小さくきしむ（チリルド）
    ice(out, T){
      const a = bed(out, noiseWhite, 'highpass', 6000, .5, .006);
      T.stops.push(every(.6, 2, () => {
        const t = now(), k = 1 + Math.floor(Math.random() * 4), base = mtof(pick([88, 91, 93, 95, 98, 100, 103]));
        for(let i = 0; i < k; i++) hit(t + i * rnd(.05, .14), base * pick([1, 1.5, 2, 1.25]), out, .02, rnd(1.2, 2.4), [1, 2.4, 4.1], rnd(-.8, .8));
      }, T.timers));
      T.stops.push(every(7, 15, () => click(now(), out, .05, 3200, 6, .08, rnd(-.5, .5)), T.timers));
      return a.nodes;
    },
    // 空：高空の風が流れ、ときどき何かが遠くを横切る（フーモラ）
    sky(out, T){
      const n = wind(out, { freq:1300, q:.5, vol:.12, rate:.08 });
      T.stops.push(every(5, 11, () => whoosh(now(), rnd(2.5, 4), .05, 400, 2600, out), T.timers));
      T.stops.push(every(4, 8, () => {
        const m = pick([81, 85, 88, 93]);
        tone(mtof(m), now(), 3, .012, 'sine', out, { attack:.8, pan:rnd(-.8, .8) });
      }, T.timers));
      return n;
    },
    // 吹雪：うなる風、雪の粒、口笛のような高い風（ガルヒューラ）
    blizzard(out, T){
      const n = wind(out, { freq:420, q:1.6, vol:.36, rate:.11, sweep:.55, brown:true })
        .concat(wind(out, { freq:1400, q:5, vol:.06, rate:.17, sweep:.4 }));
      const s = bed(out, noiseWhite, 'highpass', 4500, .4, .03);
      n.push(...s.nodes, lfo(.23, .025, s.g.gain));
      T.stops.push(every(4, 9, () => whoosh(now(), rnd(1.5, 2.8), .12, 300, 1600, out), T.timers));
      return n;
    },
    // 霧：くぐもった空気がゆっくり動き、しずくが落ちる（マイモック）
    mist(out, T){
      const a = bed(out, noiseBrown, 'lowpass', 380, .3, .2);
      const n = [...a.nodes, lfo(.03, 120, a.f.frequency), lfo(.05, .08, a.g.gain)];
      T.stops.push(every(2.5, 6, () => tone(rnd(900, 1500), now(), .25, .03, 'sine', out, { glide:rnd(400, 600), pan:rnd(-.7, .7) }), T.timers));
      T.stops.push(every(6, 12, () => tone(mtof(pick([66, 69, 73])), now(), 4, .02, 'sine', out, { attack:1.2, glide:mtof(64) }), T.timers));
      return n;
    },
    // 工房：大小の時計、細かい槌、やすり（ユーレツェア）
    workshop(out, T){
      let k = 0;
      T.stops.push(every(.5, .5, () => {
        const t = now(); click(t, out, .1, k % 2 ? 3600 : 3000, 8, .03, .35); k++;
        if(k % 2 === 0) click(t + .25, out, .06, 1500, 6, .05, -.4); // 大きな振り子時計
      }, T.timers));
      T.stops.push(every(2, 5, () => { // 小さな槌
        const t = now(), n = 2 + Math.floor(Math.random() * 3), f = rnd(1700, 2600), pan = rnd(-.6, .6);
        for(let i = 0; i < n; i++) hit(t + i * rnd(.14, .22), f, out, .05, .25, [1, 2.76, 5.4], pan);
      }, T.timers));
      T.stops.push(every(6, 12, () => { // やすり
        const t = now();
        for(let i = 0; i < 4; i++) click(t + i * .2, out, .05, 4200, 1.2, .16, .5);
      }, T.timers));
      return [];
    },
    // 歯車：途切れないラチェットと、大きな歯車の噛み合う音（キューマ）
    gears(out, T){
      const h = ctx.createOscillator(); h.type = 'triangle'; h.frequency.value = 62;
      const hg = ctx.createGain(); hg.gain.value = .03; h.connect(hg); hg.connect(out); h.start();
      let beat = 0;
      T.stops.push(every(.6, .6, () => {
        const t = now() + .02;
        for(let i = 0; i < 6; i++) click(t + i * .1, out, i % 3 ? .05 : .08, i % 3 ? 2400 : 1700, 5, .03, -.3);
        if(beat++ % 2 === 0){ hit(t + .3, 190, out, .07, .5, [1, 2.1, 3.9], .3); click(t + .3, out, .1, 600, 2, .08, .3); }
      }, T.timers));
      T.stops.push(every(5, 10, () => { // 鎖が送られる音
        const t = now();
        for(let i = 0; i < 8; i++) click(t + i * .06, out, .035, rnd(3000, 4500), 4, .02, .6);
      }, T.timers));
      return [h, lfo(.3, .015, hg.gain)];
    },
    // 街：遠い車の流れ、人の気配、横断歩道のメロディ（ニポラン）
    city(out, T){
      const a = bed(out, noiseBrown, 'lowpass', 300, .5, .22);
      const n = [...a.nodes, lfo(.07, .06, a.g.gain)].concat(murmur(out, .05));
      T.stops.push(every(3, 7, () => whoosh(now(), rnd(2, 3.5), .05, 250, 900, out), T.timers));
      T.stops.push(every(14, 24, () => { // 横断歩道の誘導音（遠く）
        const t = now(), o = echoBusTo(out, .2, .3, .4);
        for(let i = 0; i < 6; i++){ tone(mtof(i % 2 ? 88 : 91), t + i * .45, .2, .012, 'sine', o); }
      }, T.timers));
      T.stops.push(every(18, 32, () => { // 遠くの電車
        const t = now(), b = bed(out, noiseBrown, 'bandpass', 500, 1.5, 0);
        b.g.gain.linearRampToValueAtTime(.12, t + 3); b.g.gain.linearRampToValueAtTime(0, t + 7);
        setTimeout(() => b.nodes.forEach(x => { try { x.stop(); } catch(e){} }), 7500);
        for(let i = 0; i < 10; i++) click(t + 1.8 + i * .32 + (i % 2) * .1, out, .025, 700, 3, .06);
      }, T.timers));
      return n;
    },
    // 遠くの華やかな音楽：ワルツが風に乗って聞こえる（オルガロン）
    music(out, T){
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
      const g = ctx.createGain(); g.gain.value = .8; lp.connect(g);
      const o = echoBusTo(out, .23, .35, .45); g.connect(o);
      const beat = 60 / 132;
      const MEL = [
        [[0,72,1],[1,77,1],[2,81,1]], [[0,79,2],[2,77,1]], [[0,76,1],[1,77,1],[2,79,1]], [[0,72,3]],
        [[0,74,1],[1,77,1],[2,82,1]], [[0,81,1.5],[1.5,79,.5],[2,77,1]], [[0,76,1],[1,79,1],[2,76,1]], [[0,77,3]]
      ];
      const CH = [[41,[65,69,72]],[36,[64,67,72]],[36,[64,67,70]],[41,[65,69,72]],
                  [46,[65,70,74]],[41,[65,69,72]],[36,[64,67,70]],[41,[65,69,72]]];
      let bar = 0;
      T.stops.push(every(beat * 3, beat * 3, () => {
        const t = now() + .05, i = bar++ % 8;
        MEL[i].forEach(([b, m, d]) => {
          tone(mtof(m), t + b * beat, d * beat * .95, .05, 'triangle', lp);
          tone(mtof(m + 12), t + b * beat, .5, .015, 'sine', lp); // 鉄琴
        });
        tone(mtof(CH[i][0]), t, beat * .9, .07, 'sine', lp);
        [1, 2].forEach(b => CH[i][1].forEach(m => tone(mtof(m), t + b * beat, beat * .5, .014, 'triangle', lp)));
      }, T.timers));
      return [...murmur(out, .025)];
    },
    // お金：コインの音、ときどきレジ（サンルド）
    money(out, T){
      const n = murmur(out, .025);
      T.stops.push(every(1.2, 3.5, () => {
        const t = now(), f = rnd(3600, 5200), pan = rnd(-.7, .7);
        hit(t, f, out, .035, .35, [1, 1.53, 2.7], pan);
        if(Math.random() < .5) hit(t + rnd(.06, .1), f * 1.06, out, .025, .3, [1, 1.53, 2.7], pan);
      }, T.timers));
      T.stops.push(every(8, 16, () => { // コインを積む
        const t = now();
        for(let i = 0; i < 6; i++) hit(t + i * rnd(.05, .09), rnd(3200, 4800), out, .02, .2, [1, 1.53, 2.7], .4);
      }, T.timers));
      T.stops.push(every(15, 28, () => { // レジ
        const t = now();
        click(t, out, .08, 1200, 2, .06, -.3); click(t + .08, out, .06, 2000, 3, .05, -.3);
        hit(t + .18, mtof(96), out, .04, 1.2, [1, 2.4, 3.8], -.3);
        hit(t + .3, mtof(100), out, .04, 1.4, [1, 2.4, 3.8], -.3);
      }, T.timers));
      return n;
    },
    // 食：何かが焼ける音、鍋や食器、にぎわい（ヲンヘード）
    food(out, T){
      const s = bed(out, noiseWhite, 'highpass', 3000, .5, .018);
      const n = [...s.nodes, lfo(.2, .008, s.g.gain)].concat(murmur(out, .05));
      T.stops.push(every(.05, .2, () => click(now(), out, rnd(.01, .035), rnd(3000, 7000), 3, .015, rnd(-.3, .1)), T.timers));
      T.stops.push(every(3, 8, () => hit(now(), rnd(900, 1600), out, .03, .6, [1, 2.3, 4.2], rnd(-.6, .6)), T.timers));
      return n;
    },
    // 情報：電子の気配と信号音（セルトシティ・ヒューバート・科学技術）
    data(out, T){
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 110;
      const g = ctx.createGain(); g.gain.value = .03; o.connect(g); g.connect(out); o.start();
      T.stops.push(every(.35, 1.4, () =>
        tone(mtof(pick([84, 86, 88, 91, 93, 96])), now(), .07, .014, 'square', out, { pan:rnd(-.7, .7) }), T.timers));
      return [o, lfo(.2, .015, g.gain)];
    },
    // 結晶：きらめき（特殊物質）
    crystal(out, T){
      T.stops.push(every(1, 2.6, () =>
        tone(mtof(pick([81, 85, 88, 92, 93])), now(), 2.2, .02, 'triangle', out, { pan:rnd(-.7, .7), attack:.004 }), T.timers));
      return [];
    },
    // 不気味：うなりを生む低音、落ちていく音、何かの息（変異体）
    eerie(out, T){
      const nodes = [];
      [55, 55.7, 82.4].forEach(f => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = .035; o.connect(g); g.connect(out); o.start(); nodes.push(o);
      });
      const b = bed(out, noisePink, 'bandpass', 700, 3, 0);
      nodes.push(...b.nodes, lfo(.09, .05, b.g.gain), lfo(.05, 300, b.f.frequency));
      T.stops.push(every(6, 12, () => tone(mtof(pick([79, 82, 84])), now(), 3.5, .016, 'sine', out, { attack:.6, glide:mtof(70), pan:rnd(-.8, .8) }), T.timers));
      T.stops.push(every(10, 20, () => hit(now(), rnd(70, 110), out, .06, 3, [1, 1.41, 2.3], rnd(-.5, .5)), T.timers));
      T.stops.push(every(12, 25, () => { // 遠くで何かが動く
        const t = now();
        for(let i = 0; i < 3; i++) click(t + i * rnd(.2, .5), out, .05, 400, 2, .12, rnd(-.8, .8));
      }, T.timers));
      return nodes;
    },
    // 暮らし：人のざわめき、足音、自転車のベル、扉のチャイム（人々の暮らし）
    life(out, T){
      const n = murmur(out, .07);
      T.stops.push(every(4, 9, () => { // 足音
        const t = now(), k = 4 + Math.floor(Math.random() * 5), pan = rnd(-.8, .8), step = rnd(.42, .55);
        for(let i = 0; i < k; i++) click(t + i * step, out, .05, rnd(500, 800), 2, .07, pan + i * .03);
      }, T.timers));
      T.stops.push(every(10, 20, () => { // 自転車のベル
        const t = now(), p = rnd(-.8, .8);
        hit(t, 2350, out, .03, .6, [1, 2.1, 3.3], p); hit(t + .12, 2350, out, .025, .7, [1, 2.1, 3.3], p);
      }, T.timers));
      T.stops.push(every(16, 30, () => { // お店の扉
        const t = now();
        tone(mtof(88), t, .9, .02, 'sine', out, { pan:.4 }); tone(mtof(84), t + .35, 1.2, .02, 'sine', out, { pan:.4 });
      }, T.timers));
      return n;
    },
    // 歴史：遠い鐘楼の鐘と、古い紙をめくる音
    history(out, T){
      T.stops.push(every(10, 18, () => hit(now(), mtof(55), out, .045, 6, [1, 2, 2.4, 3, 4.2], rnd(-.3, .3)), T.timers));
      T.stops.push(every(5, 11, () => {
        const t = now(); whoosh(t, .35, .03, 1500, 4500, out); click(t + .3, out, .03, 2500, 1, .05);
      }, T.timers));
      return [];
    },
    // 宗教・文化：風鈴と遠い鐘
    culture(out, T){
      T.stops.push(every(2.5, 6, () => {
        const t = now(), k = 1 + Math.floor(Math.random() * 3);
        for(let i = 0; i < k; i++) hit(t + i * rnd(.15, .4), mtof(pick([86, 88, 91, 93, 96])), out, .025, 1.8, [1, 2.7, 5.1], rnd(-.5, .5));
      }, T.timers));
      T.stops.push(every(16, 28, () => hit(now(), mtof(50), out, .04, 7, [1, 2, 2.76, 4.1], 0), T.timers));
      return [];
    },
    // 組織・企業：キーボード、通知音、空調
    office(out, T){
      const a = bed(out, noisePink, 'lowpass', 400, .3, .05);
      T.stops.push(every(2, 6, () => {
        const t = now(), k = 5 + Math.floor(Math.random() * 12), pan = rnd(-.6, .6);
        let x = 0; for(let i = 0; i < k; i++){ x += rnd(.07, .17); click(t + x, out, .04, rnd(2500, 3800), 4, .025, pan); }
      }, T.timers));
      T.stops.push(every(12, 24, () => {
        const t = now(); tone(mtof(84), t, .25, .02, 'sine', out, { pan:-.4 }); tone(mtof(91), t + .12, .4, .02, 'sine', out, { pan:-.4 });
      }, T.timers));
      return a.nodes;
    },
    // 法律：静かな部屋と、ときどき遠くの木槌
    law(out, T){
      const a = bed(out, noisePink, 'lowpass', 300, .3, .04);
      T.stops.push(every(14, 26, () => {
        const t = now(); [0, .28].forEach(d => { click(t + d, out, .1, 700, 1.5, .1, .2); tone(140, t + d, .15, .04, 'sine', out); });
      }, T.timers));
      return a.nodes;
    }
  };

  // 余韻つきの出口（情景音用）
  function echoBusTo(dest, time, fb, wet){
    const inG = ctx.createGain();
    const d = ctx.createDelay(1); d.delayTime.value = time;
    const f = ctx.createGain(); f.gain.value = fb;
    const w = ctx.createGain(); w.gain.value = wet;
    inG.connect(dest); inG.connect(d); d.connect(f); f.connect(d); d.connect(w); w.connect(dest);
    return inG;
  }

  // 国ごとの情景音（null は背景のSF音だけ）
  const NATION_SCENE = {
    larliafrus:'forest', belnea:'forest', tasumenio:'sea', 'chiriludo-ailtsua':'ice',
    'fumora-skypill':'sky', garhyura:'blizzard', maimok:'mist', sertcity:'data', hubert:'data',
    yuretsuea:'workshop', kyuma:'gears', niporan:'city', orgaron:'music', sanrudo:'money', wonhead:'food'
  };
  // カテゴリーごとの情景音
  const CAT_SCENE = {
    creature:'forest', substance:'crystal', tech:'data', mutant:'eerie', life:'life',
    history:'history', culture:'culture', org:'office', law:'law',
    world:null, nation:null, glossary:null
  };

  function sceneForHash(h){
    let m;
    if((m = h.match(/^#\/article\/([^/?#]+)/))){
      const a = typeof articleById === 'function' ? articleById(m[1]) : null;
      if(!a) return null;
      if(a.cat === 'nation') return NATION_SCENE[a.id] || null;
      return CAT_SCENE[a.cat] || null;
    }
    if((m = h.match(/^#\/category\/([^/?#]+)/))) return CAT_SCENE[m[1]] || null;
    if(h.startsWith('#/life')) return 'life';
    if(h.startsWith('#/history')) return 'history';
    if(h.startsWith('#/culture')) return 'culture';
    if(h === '#/world-map') return 'sea';
    return null;
  }

  let base = null, scene = null, sceneKey = null, override = undefined;
  function startScene(key){
    const out = ctx.createGain(); out.gain.value = 0; out.connect(ambBus);
    const T = { timers:[], stops:[] };
    let nodes = [];
    try { nodes = SCENE[key](out, T) || []; } catch(e){ console.warn(e); }
    out.gain.linearRampToValueAtTime(1.5, now() + 2.2);
    return { key, out, stop(){ stopLayer(out, nodes, T); } };
  }
  function updateAmbience(force){
    if(!ctx || !unlocked) return;
    if(!prefs.amb){
      if(base){ base.stop(); base = null; }
      if(scene){ scene.stop(); scene = null; }
      sceneKey = null; return;
    }
    if(!base) base = startBase();
    const want = override !== undefined ? (override || null) : sceneForHash(location.hash);
    if(want === sceneKey && (scene || !want) && !force) return;
    if(scene){ scene.stop(); scene = null; }
    sceneKey = want;
    if(want && SCENE[want]) scene = startScene(want);
    // 情景音があるときは、背景のSF音を少し下げて場所の音を聞かせる
    base.out.gain.setTargetAtTime(scene ? .65 : 1, now() + .1, .8);
  }

  /* ---------------- ページの動きに合わせる ---------------- */
  let lastHash = location.hash;
  window.addEventListener('hashchange', () => {
    const h = location.hash;
    override = undefined;
    if(h.startsWith('#/article/')) play('open');
    else if(h !== lastHash) play('page');
    lastHash = h;
    setTimeout(() => updateAmbience(false), 60);
  });

  // タップ音：リンク・ボタン・地図の国など、操作できるものに触れたとき
  const TAP_SEL = 'a, button, [role="button"], .cat-card, .article-card, input[type="checkbox"], summary';
  document.addEventListener('pointerdown', e => {
    if(e.button > 0) return;
    const el = e.target.closest && e.target.closest(TAP_SEL);
    if(!el) return;
    if(el.closest('.wm-nation')) return;         // 地図の国は専用の音
    if(el.closest('.snd-panel')) return;         // 音設定の中は専用の音
    // ページ移動するリンクは移動音が鳴るので、タップ音は控えめに重ねる
    setTimeout(() => play('tap'), 0);
  }, true);

  // マウスのときだけ：押せるもの（リンク・ボタン・カード・地図の国）に乗ると小さく鳴る
  if(window.matchMedia && matchMedia('(hover:hover)').matches){
    const HOVER_SEL = TAP_SEL + ', .wm-nation, .wm-chip, .related-chip, label.snd-row';
    let lastEl = null;
    document.addEventListener('mouseover', e => {
      const el = e.target.closest && e.target.closest(HOVER_SEL);
      if(el && el !== lastEl){ lastEl = el; play(el.closest('.wm-nation') ? 'hoverMap' : 'hover'); }
      if(!el) lastEl = null;
    });
  }

  /* ---------------- ヘッダーの音ボタン ---------------- */
  const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.2 6.5a8 8 0 0 1 0 11"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

  function buildButton(){
    const actions = document.querySelector('.header-actions');
    if(!actions || document.getElementById('snd-btn')) return;
    const wrap = document.createElement('div');
    wrap.className = 'snd-wrap';
    wrap.innerHTML = `
      <button class="icon-btn snd-btn" id="snd-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="サウンド設定"></button>
      <div class="snd-panel" id="snd-panel" role="dialog" aria-label="サウンド設定" hidden>
        <div class="snd-title">SOUND</div>
        <label class="snd-row"><span>効果音<small>タップ・資料を開く音</small></span>
          <input type="checkbox" id="snd-sfx" class="snd-switch"></label>
        <label class="snd-row"><span>環境音<small>SFの空気と、場所ごとの音</small></span>
          <input type="checkbox" id="snd-amb" class="snd-switch"></label>
        <label class="snd-row snd-vol"><span>音量</span>
          <input type="range" id="snd-vol" min="0" max="100" step="1"></label>
        <button type="button" class="snd-mute" id="snd-mute">すべてオフ</button>
      </div>`;
    actions.insertBefore(wrap, actions.firstChild);

    const btn = wrap.querySelector('#snd-btn'), panel = wrap.querySelector('#snd-panel');
    const cSfx = wrap.querySelector('#snd-sfx'), cAmb = wrap.querySelector('#snd-amb');
    const vol = wrap.querySelector('#snd-vol'), mute = wrap.querySelector('#snd-mute');

    function render(){
      const on = prefs.sfx || prefs.amb;
      btn.innerHTML = on ? ICON_ON : ICON_OFF;
      btn.classList.toggle('is-off', !on);
      btn.setAttribute('aria-label', on ? 'サウンド設定（音あり）' : 'サウンド設定（消音中）');
      cSfx.checked = prefs.sfx; cAmb.checked = prefs.amb;
      vol.value = Math.round(prefs.vol * 100);
      mute.textContent = on ? 'すべてオフ' : 'すべてオン';
    }
    function apply(){
      savePrefs(); render();
      if(!ctx) return;
      const t = now();
      sfxBus.gain.setTargetAtTime(prefs.sfx ? .9 : 0, t, .05);
      ambBus.gain.setTargetAtTime(prefs.amb ? .8 : 0, t, .3);
      master.gain.setTargetAtTime(prefs.vol, t, .05);
      updateAmbience(false);
    }
    function open(v){
      panel.hidden = !v; btn.setAttribute('aria-expanded', String(v));
    }
    btn.addEventListener('click', e => { e.stopPropagation(); open(panel.hidden); });
    panel.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => open(false));
    document.addEventListener('keydown', e => { if(e.key === 'Escape') open(false); });

    cSfx.addEventListener('change', () => { unlock(); prefs.sfx = cSfx.checked; apply(); if(prefs.sfx) play('toggleOn'); });
    cAmb.addEventListener('change', () => { unlock(); prefs.amb = cAmb.checked; apply(); });
    vol.addEventListener('input', () => { unlock(); prefs.vol = vol.value / 100; apply(); });
    vol.addEventListener('change', () => play('tap'));
    mute.addEventListener('click', () => {
      unlock();
      const on = prefs.sfx || prefs.amb;
      prefs.sfx = !on; prefs.amb = !on; apply();
      if(!on) play('toggleOn');
    });
    render();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildButton);
  else buildButton();

  /* ---------------- 他のスクリプトから使う窓口 ---------------- */
  window.MCSound = {
    play,
    // 地図で国を選んだとき、その国の環境音に一時的に切り替える
    focusNation(id){
      override = id ? (NATION_SCENE[id] || '') : undefined;
      updateAmbience(false);
    }
  };
})();
