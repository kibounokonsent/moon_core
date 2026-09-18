const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

// index.html の <script> 順そのまま（calendar/climate/news/app.js は除く＝データではないため）
const FILES = [
  'js/data/00-categories.js',
  'js/data/news-items.js',
  'js/data/articles-world-life.js',
  'js/data/articles-history.js',
  'js/data/articles-tech.js',
  'js/data/articles-substance.js',
  'js/data/articles-creature.js',
  'js/data/articles-mutant.js',
  'js/data/articles-culture.js',
  'js/data/articles-law.js',
  'js/data/nations/belnea.js',
  'js/data/nations/chiriludo-ailtsua.js',
  'js/data/nations/fumora-skypill.js',
  'js/data/nations/garhyura.js',
  'js/data/nations/hubert.js',
  'js/data/nations/kyuma.js',
  'js/data/nations/larliafrus.js',
  'js/data/nations/maimok.js',
  'js/data/nations/niporan.js',
  'js/data/nations/orgaron.js',
  'js/data/nations/sanrudo.js',
  'js/data/nations/sertcity.js',
  'js/data/nations/tasumenio.js',
  'js/data/nations/wonhead.js',
  'js/data/nations/yuretsuea.js',
  'js/data/org/antioldrange.js',
  'js/data/org/code.js',
  'js/data/org/international-organizations.js',
  'js/data/org/kounkoubou.js',
  'js/data/org/deoxycorp.js',
  'js/data/org/dnar.js',
  'js/data/org/evolions.js',
  'js/data/org/freshresh.js',
  'js/data/org/gekaisis.js',
  'js/data/org/goldenspecialmenicompany.js',
  'js/data/org/grk.js',
  'js/data/org/hagurumaunion.js',
  'js/data/org/happycaddy.js',
  'js/data/org/harnens_university.js',
  'js/data/org/harnest.js',
  'js/data/org/harnens_institute.js',
  'js/data/org/hatenkurenbu.js',
  'js/data/org/hitsritche.js',
  'js/data/org/hyokyo.js',
  'js/data/org/jungler.js',
  'js/data/org/kachoufuugetsu.js',
  'js/data/org/kogamichurch.js',
  'js/data/org/miretche.js',
  'js/data/org/naturalfriend.js',
  'js/data/org/noahsark.js',
  'js/data/org/oldworldmuseum.js',
  'js/data/org/perfectfood.js',
  'js/data/org/rifinesu.js',
  'js/data/org/sanparallel-company.js',
  'js/data/org/setsuhyo.js',
  'js/data/org/seyo.js',
  'js/data/org/shirasu.js',
  'js/data/org/stralibady.js',
  'js/data/org/svh.js',
  'js/data/org/telepass.js',
  'js/data/org/tensho.js',
  'js/data/org/wishpolan.js',
  'js/data/org/worldcreditbank.js',
  'js/data/org/worldtreec.js',
  'js/data/org/yokubounosu.js',
  'js/data/glossary.js',
];

const sandbox = {};
vm.createContext(sandbox);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const ARTICLES = vm.runInContext('ARTICLES', sandbox);
const GLOSSARY = vm.runInContext('GLOSSARY', sandbox) || [];
console.error(`読み込んだ記事数: ${ARTICLES.length} / 用語集: ${GLOSSARY.length}件`);

/* ---------------- 記事1件分の全テキストを1つの文字列に集約 ---------------- */
function collectText(article) {
  const parts = [article.title, article.lede];
  (article.sections || []).forEach(sec => {
    if (sec.title) parts.push(sec.title);
    (sec.blocks || []).forEach(b => {
      if (b.text) parts.push(b.text);
      if (Array.isArray(b.items)) {
        b.items.forEach(it => {
          if (typeof it === 'string') parts.push(it);
          else if (it && typeof it === 'object') {
            ['name', 'role', 'desc', 'label', 'value', 'title', 'text'].forEach(k => {
              if (it[k]) parts.push(it[k]);
            });
          }
        });
      }
      if (b.headers) parts.push(b.headers.join(' '));
      if (b.rows) b.rows.forEach(r => parts.push(Array.isArray(r) ? r.join(' ') : String(r)));
    });
  });
  return parts.filter(Boolean).join('\n');
}

const articleTexts = ARTICLES.map(a => ({ id: a.id, title: a.title, text: collectText(a) }));

/* ---------------- 既存の用語集・記事タイトルは除外対象 ---------------- */
const existingGlossaryTerms = new Set(GLOSSARY.map(g => g.term));
const titleSet = new Set(ARTICLES.map(a => a.title));

/* ---------------- ① カタカナ語候補の抽出（長さ3文字以上の連続したカタカナ列） ---------------- */
const KATAKANA_RE = /[ァ-ヶー・]{3,}/g;

// 助詞・語尾になりやすい記号や、意味を持たない短い断片を弾くための簡易フィルタ
function isNoisyKatakana(term) {
  if (/^[ー・]+$/.test(term)) return true; // 記号のみ
  return false;
}

const katakanaDocFreq = new Map(); // term -> Set(articleId)
articleTexts.forEach(({ id, text }) => {
  const seen = new Set();
  const matches = text.match(KATAKANA_RE) || [];
  matches.forEach(term => {
    if (isNoisyKatakana(term)) return;
    if (existingGlossaryTerms.has(term)) return;
    if (!seen.has(term)) {
      seen.add(term);
      katakanaDocFreq.set(term, (katakanaDocFreq.get(term) || new Set()));
      katakanaDocFreq.get(term).add(id);
    }
  });
});

/* ---------------- ② 既存の記事タイトル・GLOSSARY用語が「他の記事」に
                      何回登場しているか（＝概念として広く参照されている度合い） ---------------- */
const conceptDocFreq = new Map(); // title -> Set(articleId)  ※自記事は除く
ARTICLES.forEach(owner => {
  if (!owner.title || owner.title.length < 2) return;
  articleTexts.forEach(({ id, text }) => {
    if (id === owner.id) return;
    if (text.includes(owner.title)) {
      if (!conceptDocFreq.has(owner.title)) conceptDocFreq.set(owner.title, new Set());
      conceptDocFreq.get(owner.title).add(id);
    }
  });
});

/* ---------------- 結果整形 ---------------- */
const KATAKANA_MIN_DOCS = 3; // これ未満は候補から除外（ノイズが多いため）
const CONCEPT_MIN_DOCS = 3;

const katakanaCandidates = [...katakanaDocFreq.entries()]
  .filter(([term, set]) => set.size >= KATAKANA_MIN_DOCS)
  .map(([term, set]) => ({ term, count: set.size, articles: [...set] }))
  .sort((a, b) => b.count - a.count);

const conceptCandidates = [...conceptDocFreq.entries()]
  .filter(([term, set]) => set.size >= CONCEPT_MIN_DOCS && !existingGlossaryTerms.has(term))
  .map(([term, set]) => ({ term, count: set.size, articles: [...set] }))
  .sort((a, b) => b.count - a.count);

// GLOSSARYには載っているが articleId が未設定 かつ 実は同名記事が存在するもの（リンク漏れ）
const idSet = new Set(ARTICLES.map(a => a.id));
const titleToId = {};
ARTICLES.forEach(a => { titleToId[a.title] = a.id; });
const missingLinks = GLOSSARY
  .filter(g => !g.articleId && titleToId[g.term])
  .map(g => ({ term: g.term, articleId: titleToId[g.term] }));
const brokenLinks = GLOSSARY
  .filter(g => g.articleId && !idSet.has(g.articleId))
  .map(g => ({ term: g.term, articleId: g.articleId }));

/* ---------------- レポート出力 ---------------- */
let md = `# GLOSSARY 候補レポート\n\n`;
md += `記事数: ${ARTICLES.length} / 現在の用語集: ${GLOSSARY.length}件\n\n`;

md += `## ① articleId のリンク漏れ・不整合（自動修正の余地あり）\n\n`;
if (missingLinks.length === 0 && brokenLinks.length === 0) {
  md += `なし\n\n`;
} else {
  if (missingLinks.length) {
    md += `**articleId未設定だが、同名記事が存在する**\n\n`;
    missingLinks.forEach(m => { md += `- 「${m.term}」→ articleId: \`${m.articleId}\`\n`; });
    md += `\n`;
  }
  if (brokenLinks.length) {
    md += `**articleIdが設定されているが、該当記事が存在しない**\n\n`;
    brokenLinks.forEach(m => { md += `- 「${m.term}」→ articleId: \`${m.articleId}\`（存在しません）\n`; });
    md += `\n`;
  }
}

md += `## ② 用語集に未登録の既存記事タイトル（他の記事から${CONCEPT_MIN_DOCS}件以上参照されている）\n\n`;
md += `記事として既に存在するのに、GLOSSARYに短い定義が無いため用語集ページで引けない概念です。\n\n`;
if (conceptCandidates.length === 0) {
  md += `なし\n\n`;
} else {
  conceptCandidates.forEach(c => {
    md += `- **${c.term}** — ${c.count}記事から参照\n`;
  });
  md += `\n`;
}

md += `## ③ カタカナ用語の頻出候補（記事本文中に${KATAKANA_MIN_DOCS}件以上の記事で登場、GLOSSARY未登録）\n\n`;
md += `独自の造語・固有名詞である可能性が高いカタカナ列を抽出しています。一般的なカタカナ語（外来語）も混ざるため、目視での取捨選択が必要です。\n\n`;
if (katakanaCandidates.length === 0) {
  md += `なし\n\n`;
} else {
  katakanaCandidates.forEach(c => {
    const linkedArticle = titleToId[c.term] ? `（既存記事あり: \`${titleToId[c.term]}\`）` : '';
    md += `- **${c.term}** — ${c.count}記事で使用${linkedArticle}\n`;
  });
  md += `\n`;
}

fs.writeFileSync(path.join(ROOT, 'glossary_candidates.md'), md, 'utf8');
console.error(`\n✅ glossary_candidates.md を出力しました`);
console.error(`　①リンク漏れ: ${missingLinks.length + brokenLinks.length}件`);
console.error(`　②未登録タイトル候補: ${conceptCandidates.length}件`);
console.error(`　③カタカナ候補: ${katakanaCandidates.length}件`);
