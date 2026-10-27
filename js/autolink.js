/* ============================================================================
   AUTOLINK — 記事本文中の「ほかの記事の名前」を自動でリンクにする（wiki風）
   ----------------------------------------------------------------------------
   ・記事データは編集不要。描画後に本文を走査してリンク化します。
   ・対象：記事タイトル／用語集の語（articleId付き）／国名の前半（例：フーモラ）／a.aliases
   ・同じ語は、見出し（節）ごとに最初の1回だけリンク化（2026.10.27 変更。以前は1ページに1回）。
   ・自分自身の記事、見出し、既存リンク、表の見出し、関連項目は対象外。
   ・特定の記事を対象から外したいときは、記事に autolink:false を書く。
   ・別名を足したいときは、記事に aliases:['別名1','別名2'] を書く。
   ============================================================================ */
(function(){
  'use strict';
  var MIN_LEN = 2;   // これより短い語は自動リンクしない（「月」など。必要なら aliases で明示）

  function stripParen(t){ return t.replace(/[（(][^）)]*[）)]/g,'').trim(); }

  var dictCache = null;
  function buildDict(){
    if(dictCache) return dictCache;
    var map = {};                       // 語 -> 記事id
    var add = function(term, id, force){
      if(!term || (!force && term.length < MIN_LEN)) return;
      if(!map[term]) map[term] = id;    // 先に登録された方を優先
    };
    var arts = (typeof ARTICLES!=='undefined') ? ARTICLES : [];
    // 1) タイトル（完全一致を最優先）
    arts.forEach(function(a){ if(a.autolink===false) return; add(a.title, a.id); });
    // 2) 括弧を除いたタイトル／aliases
    arts.forEach(function(a){
      if(a.autolink===false) return;
      add(stripParen(a.title), a.id);
      (a.aliases||[]).forEach(function(al){ add(al, a.id, true); });
    });
    // 2b) 英語表記・別表記（記事データに aliases が無いものを補う。2026.10.27）
    var EXTRA = {
      'ordrange': ['Oldrange','Ordrange'],
      'mother-colony': ['Mother','Colony','マザー','コロニー'],
      'svh': ['S.V.H.','SVH'],
      'dnar': ['DNAR'],
      'dominion': ['Dominion'],
      'variant': ['Variants','Variant'],
      'pure-variant': ['Pure Variant'],
      'special-variant': ['Special Variant'],
      'three-element-theory': ['Three-Element Theory']
    };
    Object.keys(EXTRA).forEach(function(id){
      if(!arts.some(function(a){ return a.id===id && a.autolink!==false; })) return;
      EXTRA[id].forEach(function(t){ add(t, id, true); });
    });
    // 3) 用語集（articleId付き）
    (typeof GLOSSARY!=='undefined'?GLOSSARY:[]).forEach(function(g){ if(g.articleId) add(g.term, g.articleId); });
    // 4) 国名の前半（「フーモラ・スカイピル」→「フーモラ」）。他の語と衝突する場合は登録しない
    arts.forEach(function(a){
      if(a.cat!=='nation' || a.autolink===false) return;
      var head = stripParen(a.title).split('・')[0];
      if(head.length>=3 && !map[head]) map[head] = a.id;
    });
    var terms = Object.keys(map).sort(function(x,y){ return y.length - x.length; });
    var esc = function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); };
    var re = terms.length ? new RegExp(terms.map(esc).join('|'),'g') : null;
    dictCache = { map: map, re: re };
    return dictCache;
  }
  // 記事データが後から変わった場合に備えて外から無効化できるようにする
  window.autolinkReset = function(){ dictCache = null; };

  // テキストを [{text} | {term,id}] に分割（DOMに依存しない純粋関数）
  function split(text, ownerId, used){
    var d = buildDict(); if(!d.re) return [{text:text}];
    var out = [], last = 0, m;
    d.re.lastIndex = 0;
    while((m = d.re.exec(text))){
      var term = m[0], id = d.map[term];
      if(id === ownerId || used[term]) continue;     // 自分自身／2回目以降は対象外
      if(m.index > last) out.push({text:text.slice(last, m.index)});
      out.push({term:term, id:id});
      used[term] = true;
      last = m.index + term.length;
    }
    if(last < text.length) out.push({text:text.slice(last)});
    return out;
  }
  window.autolinkSplit = split;   // テスト用

  var SKIP = {A:1,H1:1,H2:1,H3:1,TH:1,BUTTON:1,CODE:1,SCRIPT:1,STYLE:1,INPUT:1,TEXTAREA:1};
  function skipEl(el){
    if(SKIP[el.tagName]) return true;
    if(el.classList && (el.classList.contains('related-links') || el.classList.contains('info-card-label') || el.classList.contains('autolink') || el.classList.contains('admin-section-badge'))) return true;
    return false;
  }

  /* 管理者用設定のブロックは本文とは別の「ページ」として数える（2026.10.27）。
     本文で一度リンクした語でも、管理者用設定の中で最初に出たところは改めてリンクする。 */
  var ADMIN_SEL = '.admin-section-block';
  function apply(root, ownerId){
    if(!root) return;
    applyIn(root, ownerId, true, {});
    if(root.querySelectorAll){
      var adminUsed = {};   // 管理者用設定ぜんたいで、同じ語は最初の1回だけ
      [].forEach.call(root.querySelectorAll(ADMIN_SEL), function(blk){ applyIn(blk, ownerId, false, adminUsed); });
    }
  }
  /* 同じ語は「見出し（節）ごとに最初の1回」リンクする（2026.10.27）。
     長い記事でも、読んでいる節の中でリンクが見つかるようにするため。 */
  var SECTION_HEAD = {H2:1};
  function applyIn(root, ownerId, skipAdmin, used){
    var nodes = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function(n){
        if(n.nodeType === 1) return SECTION_HEAD[n.tagName] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        if(!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        for(var p = n.parentNode; p && p !== root; p = p.parentNode){
          if(p.nodeType===1 && skipEl(p)) return NodeFilter.FILTER_REJECT;
          if(skipAdmin && p.nodeType===1 && p.matches && p.matches(ADMIN_SEL)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      if(n.nodeType === 1){ for(var k in used) delete used[k]; return; }   // 新しい節に入ったら数え直す
      var parts = split(n.nodeValue, ownerId, used);
      if(parts.length===1 && !parts[0].term) return;
      var frag = document.createDocumentFragment();
      parts.forEach(function(p){
        if(p.term){
          var a = document.createElement('a');
          a.className = 'autolink';
          a.href = '#/article/' + p.id;
          a.textContent = p.term;
          frag.appendChild(a);
        } else {
          frag.appendChild(document.createTextNode(p.text));
        }
      });
      n.parentNode.replaceChild(frag, n);
    });
  }

  function currentArticleId(){
    var m = /^#\/article\/([^\/?#]+)/.exec(location.hash || '');
    return m ? decodeURIComponent(m[1]) : null;
  }
  function run(){
    var id = currentArticleId(); if(!id) return;
    apply(document.querySelector('#app .content-card'), id);
  }

  // 記事ページの描画関数を包む（描画のあとにリンク化する）
  if(typeof window.renderArticlePage === 'function'){
    var orig = window.renderArticlePage;
    window.renderArticlePage = function(id){
      var r = orig.apply(this, arguments);
      try{ apply(document.querySelector('#app .content-card'), id); }catch(e){ console.error('autolink', e); }
      return r;
    };
  }
  // すでに記事ページが表示されている場合（直接URLで開いた場合）
  try{ run(); }catch(e){ console.error('autolink', e); }
})();
