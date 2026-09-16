const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, 'moon_core');

// index.html の <script> 順そのまま（calendar/climate/app.js は除く）
const FILES = [
  'js/data/00-categories.js',
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
const CATEGORIES = vm.runInContext('CATEGORIES', sandbox);
const GLOSSARY = vm.runInContext('GLOSSARY', sandbox) || [];
console.error(`読み込んだ記事数: ${ARTICLES.length}`);

const idSet = new Set(ARTICLES.map(a => a.id));
const allIds = [...idSet];
const CATEGORY_KEYS = new Set((CATEGORIES || []).map(c => c.key));

/* ---------------- レベンシュタイン距離 ---------------- */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

function looksLikeTermNotId(ref) {
  const isJapanese = /[\u3040-\u30ff\u4e00-\u9fff]/.test(ref);
  const hasHyphen = ref.includes('-');
  return (isJapanese && !hasHyphen) || CATEGORY_KEYS.has(ref);
}

function idTypoMatch(ref, ownerId) {
  const refLower = ref.toLowerCase();
  // 短い純粋な英単語（food, dragon, ai など）はIDの断片ではなく用語の残骸である
  // 可能性が高いため、タイプミス推定の対象から外す（false positiveを避ける）
  if (/^[a-z]+$/.test(ref) && ref.length <= 6) return null;

  const exact = allIds.find(id => id.toLowerCase() === refLower && id !== ownerId);
  if (exact) return { id: exact, dist: 0 };

  // 先頭語一致（EIO→eio-evolion 等）。ただし一致先が自分自身しかない場合は
  // 「本来は別記事を指すはずが、まだ存在しない」ケースなので推測を諦める。
  const selfPrefixHit = allIds.some(id => id.toLowerCase().split('-')[0] === refLower && refLower.length >= 3 && id === ownerId);
  if (selfPrefixHit) return null;
  const prefixHit = allIds.find(id => {
    if (id === ownerId) return false;
    const firstPart = id.toLowerCase().split('-')[0];
    return firstPart === refLower && refLower.length >= 3;
  });
  if (prefixHit) return { id: prefixHit, dist: 1 };

  let best = null, bestDist = Infinity;
  allIds.forEach(id => {
    if (id === ownerId) return;
    const d = levenshtein(refLower, id.toLowerCase());
    if (d < bestDist) { bestDist = d; best = id; }
  });
  // 短い参照ほど「たまたま近いだけの別物」を拾いやすいので、厳しめの閾値にする
  const threshold = ref.length <= 6 ? 1 : Math.max(2, Math.floor(Math.max(ref.length, best ? best.length : 0) * 0.3));
  if (best && bestDist <= threshold) return { id: best, dist: bestDist };
  return null;
}

/* ---------------- タイトル／見出し／用語集（＝概念）の索引 ----------------
   公開セクションのみを対象にする（admin.sections は除外＝非公開情報を漏らさない） */
const titleToId = {};
const sectionTitleToIds = {};
const glossaryToId = {};
GLOSSARY.forEach(g => { if (g.articleId) glossaryToId[g.term] = g.articleId; });
ARTICLES.forEach(a => {
  titleToId[a.title] = a.id;
  (a.sections || []).forEach(s => {
    if (!s.title) return;
    if (!sectionTitleToIds[s.title]) sectionTitleToIds[s.title] = [];
    sectionTitleToIds[s.title].push(a.id);
  });
});

/* ---------------- 個別に内容を確認して判断した対応表 ----------------
   自動解析だけでは判断できない（自己参照／英語の一般語／管理者限定コンテンツ
   への言及／複数記事で共用される汎用見出しなど）ものを、実際の本文を読んで
   人間が判断した結果。ここにあるものは自動解析の結果より優先する。 */
const MANUAL_OVERRIDES = {
  'future-food-seasoning::food': 'REMOVE',
  'future-food-seasoning::medical-technology': 'medical-tech',
  'alcohol-and-cigarette::age-values': 'REMOVE',
  'income-and-living::age-values': 'REMOVE',
  'svh-hero::mutant': 'variant',
  'svh-hero::mutant-warning-area': 'svh',
  'gear-war::history-timeline': 'REMOVE',
  'orgaron-figures::bamberk-tower': 'REMOVE',
  'orgaron-figures::history-timeline': 'REMOVE',
  'blood-altar::history-timeline': 'REMOVE',
  'ancient-civilization::wing-mark': 'fumora-skypill',
  'ancient-civilization::history-timeline': 'REMOVE',
  'modern-civilization::history-timeline': 'REMOVE',
  'dragon-cave::ancient-creatures': 'REMOVE',
  'dragon-cave::geological-phenomena': 'REMOVE',
  'dragon-cave::caves': 'REMOVE',
  'dragon-cave::dragon': 'REMOVE',
  'ancient-life-restoration::creature': 'REMOVE',
  'silly-news::eurecea': 'yuretsuea',
  'kansai-disaster::dominion': 'REMOVE',
  'future-philosophy::chrone': 'REMOVE',
  'galtanda-law::ai': 'ai-tech',
  'galtanda-law::life-science': 'REMOVE',
  'world-ethics-law::life-science': 'REMOVE',
  'android-law::ai': 'ai-tech',
  'world-reconstruction-agreement::world-science-alliance': 'REMOVE',
  'world-unity-declaration::world-science-alliance': 'REMOVE',
  'world-order::world-peace-agreement': 'world-peace-treaty',
  'world-order::world-science-alliance': 'REMOVE',
  'world-famous-universities::science-and-technology': 'REMOVE',
  'niporan::S.V.H.': 'svh',
  'code::name1000': 'REMOVE',
  'international-organizations::science-league': 'REMOVE',
  'international-organizations::who': 'REMOVE',
  'international-organizations::lsa': 'REMOVE',
  'international-organizations::weo': 'world-environment-agreement',
  'world-environment-agreement::weo': 'international-organizations',
  'gekaisis::ruverian': 'tasumenio',
  'yokubounosu::wolvptas_spinophen': 'REMOVE',
  'chiriludo-ailtsua::天界氷廊群': 'REMOVE',
  'garhyura::フロスタン': 'REMOVE',
  'hubert::ハーネンス': 'REMOVE',
  'wonhead::食文化': 'REMOVE',
  'sanparallel-company::人体改造': 'REMOVE',
  'sanparallel-company::変異': 'REMOVE',
  'miracle-flower::リフィネス': 'rifinesu-religion',
  'red-black-vine::生態系': 'REMOVE',
  'tasumenio::海底都市': 'REMOVE',
};

/* ---------------- 壊れたrefの解決 ---------------- */
function resolveBrokenRef(ref, ownerId) {
  const overrideKey = `${ownerId}::${ref}`;
  if (MANUAL_OVERRIDES[overrideKey]) {
    const v = MANUAL_OVERRIDES[overrideKey];
    if (v === 'REMOVE') return { remove: true, method: 'manual-remove' };
    return { id: v, method: 'manual' };
  }
  // 0. 用語集（GLOSSARY）に完全一致する正式な用語
  if (glossaryToId[ref] && glossaryToId[ref] !== ownerId) {
    return { id: glossaryToId[ref], method: 'glossary' };
  }
  // 1. 記事タイトルへの完全一致（旧仕様：IDの代わりにタイトル文字列が入っていた）
  if (titleToId[ref] && titleToId[ref] !== ownerId) {
    return { id: titleToId[ref], method: 'title-exact' };
  }
  // 2. 見出し（概念）への完全一致：自分以外の"1記事だけ"にその見出しがあれば誘導。
  //    2記事を超えて出現する見出し（「歴史」「価値観」等の汎用見出し）は
  //    特定のしようがないので用語扱いにする。
  const owners = (sectionTitleToIds[ref] || []).filter(id => id !== ownerId);
  if (owners.length === 1) return { id: owners[0], method: 'section-title' };
  if (owners.length === 2) return { multi: owners, method: 'section-title-multi' };
  // 3. カテゴリ名・一般用語っぽい場合はここで打ち切り（IDタイプミス扱いにしない）
  if (looksLikeTermNotId(ref)) return null;
  // 4. IDタイプミス（英数字IDの近似一致）
  const typo = idTypoMatch(ref, ownerId);
  if (typo) return { id: typo.id, method: 'id-typo', dist: typo.dist };
  return null;
}

const dupRefs = [];
const resolvedFixes = [];   // {ownerId, ownerTitle, ref, target, method}
const removedRefs = [];     // {ownerId, ownerTitle, ref, method}

ARTICLES.forEach(a => {
  const rel = a.related || [];
  const seen = new Set();
  rel.forEach(ref => {
    if (seen.has(ref)) dupRefs.push({ id: a.id, title: a.title, ref });
    seen.add(ref);
    if (idSet.has(ref)) return;
    const result = resolveBrokenRef(ref, a.id);
    if (!result) {
      // 個別確認・自動解析のどちらでも解決できなかったものは、
      // 存在しないリンクを残さないため related から取り除く（内容の削除ではない）
      removedRefs.push({ ownerId: a.id, ownerTitle: a.title, ref, method: 'unresolved-removed' });
    } else if (result.remove) {
      removedRefs.push({ ownerId: a.id, ownerTitle: a.title, ref, method: 'manual-remove' });
    } else if (result.multi) {
      result.multi.forEach(id => resolvedFixes.push({ ownerId: a.id, ownerTitle: a.title, ref, target: id, method: result.method }));
    } else {
      resolvedFixes.push({ ownerId: a.id, ownerTitle: a.title, ref, target: result.id, method: result.method });
    }
  });
});

/* ---------------- 本文解析による関連候補（相互参照＋カテゴリ一致でスコアリング） ---------------- */
function articleText(a) {
  let text = (a.title || '') + ' ' + (a.lede || '');
  (a.sections || []).forEach(s => {
    text += ' ' + (s.title || '');
    (s.blocks || []).forEach(b => {
      if (b.text) text += ' ' + b.text;
      if (b.items) b.items.forEach(it => {
        text += ' ' + [it.label, it.value, it.name, it.desc, it.role].filter(Boolean).join(' ');
      });
    });
  });
  return text;
}
const textCache = {};
ARTICLES.forEach(a => { textCache[a.id] = articleText(a); });

const titleIndex = ARTICLES.map(a => ({ id: a.id, title: a.title, cat: a.cat }));

function candidatesFor(a, resolvedRelatedIds) {
  const text = textCache[a.id];
  const existing = new Set(resolvedRelatedIds);
  const hits = [];

  // 1. 本文中に相手の記事タイトルが明示されている場合
  titleIndex.forEach(o => {
    if (o.id === a.id || existing.has(o.id) || o.title.length < 2) return;
    const occAtoB = text.split(o.title).length - 1;
    if (occAtoB === 0) return;
    const occBtoA = textCache[o.id].split(a.title).length - 1;
    let score = occAtoB * 2;
    if (o.cat === a.cat) score += 1;
    if (occBtoA > 0) score += 3;
    hits.push({
      id: o.id, title: o.title, score,
      confidence: score >= 8 ? '✓' : (score >= 4 ? '△' : null)
    });
  });

  const strong = hits.filter(h => h.confidence)
    .sort((x, y) => y.score - x.score)
    .slice(0, 6);

  // 2. 明示的なタイトル参照が無い記事でも、関連記事を空にしない。
  //    同一カテゴリの記事同士を本文・タイトルの共通語で軽く照合する。
  //    それでも共通語が無ければ、同一カテゴリの記事をフォールバック候補にする。
  if (strong.length === 0) {
    const tokens = s => [...new Set(
      (s || '').match(/[一-龯々〆ヵヶ]{2,}|[ぁ-んァ-ヶー]{3,}|[A-Za-z]{3,}/g) || []
    )];

    const aTokens = tokens(text);
    const fallback = titleIndex
      .filter(o => o.id !== a.id && !existing.has(o.id) && o.cat === a.cat)
      .map(o => {
        const oTokens = tokens(textCache[o.id]);
        const overlap = aTokens.filter(t => oTokens.includes(t)).length;
        return {
          id: o.id,
          title: o.title,
          score: overlap,
          confidence: overlap > 0 ? '△' : 'fallback'
        };
      })
      .sort((x, y) => y.score - x.score || x.title.localeCompare(y.title, 'ja'))
      .slice(0, 6);

    return fallback;
  }

  return strong;
}

/* ---------------- 記事ごとの最終related（修正を反映した後の姿） ---------------- */
const perArticle = {};
ARTICLES.forEach(a => {
  const rel = a.related || [];
  const kept = rel.filter(ref => idSet.has(ref));
  const fixedHere = resolvedFixes.filter(f => f.ownerId === a.id).map(f => f.target);
  const resolvedIds = [...new Set([...kept, ...fixedHere])];
  const candidates = candidatesFor(a, resolvedIds);
  const highConf = candidates.filter(c => c.confidence === '✓').map(c => c.id);
  const medConf = candidates.filter(c => c.confidence === '△');

  let autoAdded = [];
  if (resolvedIds.length < 3) {
    autoAdded = highConf.slice(0, 4 - resolvedIds.length);
    if (autoAdded.length === 0) {
      autoAdded = candidates
        .filter(c => c.confidence === '△' || c.confidence === 'fallback')
        .slice(0, 4 - resolvedIds.length)
        .map(c => c.id);
    }
  }
  const finalIds = [...new Set([...resolvedIds, ...autoAdded])];

  const brokenCount = rel.length - kept.length;

  let status;
  if (brokenCount > 0) status = '自動修正済み';
  else if (finalIds.length === 0) status = '関連記事なし';
  else if (rel.length === 0 && autoAdded.length > 0) status = '関連記事不足（自動補完）';
  else if (kept.length < 2 && medConf.length > 0) status = '関連記事不足';
  else status = '正常';

  perArticle[a.id] = {
    title: a.title, status,
    before: rel, after: finalIds,
    autoAdded, mediumCandidates: medConf, brokenCount,
  };
});

/* ---------------- レポート出力 ---------------- */
const statusCounts = {};
Object.values(perArticle).forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });

const lines = [];
lines.push('# RELATED AUTO CHECK');
lines.push('');
lines.push(`全記事: ${ARTICLES.length}`);
Object.entries(statusCounts).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
lines.push('');

lines.push('## 記事IDの重複');
const idCount = {};
ARTICLES.forEach(a => { idCount[a.id] = (idCount[a.id] || 0) + 1; });
const dupIds = Object.entries(idCount).filter(([, c]) => c > 1);
lines.push(dupIds.length === 0 ? '- 重複なし' : dupIds.map(([id, c]) => `- ${id} が${c}件重複`).join('\n'));
lines.push('');

lines.push('## related内の重複参照');
lines.push(dupRefs.length === 0 ? '- なし' : dupRefs.map(r => `- 「${r.title}」(${r.id}) → \`${r.ref}\``).join('\n'));
lines.push('');

lines.push('## 解決した壊れた参照（用語集／タイトル一致／見出し一致／個別確認／IDタイプミス）');
lines.push(resolvedFixes.length === 0 ? '- なし' : resolvedFixes.map(f => `- 「${f.ownerTitle}」(${f.ownerId}): \`${f.ref}\` → \`${f.target}\`（${f.method}）`).join('\n'));
lines.push('');

lines.push('## relatedから削除した参照（対応する記事が実在しない／自己参照など、確認の上で削除）');
lines.push(removedRefs.length === 0 ? '- なし' : removedRefs.map(f => `- 「${f.ownerTitle}」(${f.ownerId}): \`${f.ref}\`（${f.method}）`).join('\n'));
lines.push('');

lines.push('## 記事ごとの詳細（現在 → 解析後。変化がない記事は省略）');
ARTICLES.forEach(a => {
  const p = perArticle[a.id];
  if (p.status === '正常' && p.brokenCount === 0 && p.autoAdded.length === 0 && p.mediumCandidates.length === 0) return;
  lines.push(`### 「${p.title}」(${a.id}) — ${p.status}`);
  lines.push(`- 現在: ${p.before.join(', ') || '(なし)'}`);
  lines.push(`- 解析後: ${p.after.join(', ') || '(なし)'}`);
  if (p.autoAdded.length) lines.push(`- ✓ 自動追加: ${p.autoAdded.join(', ')}`);
  if (p.mediumCandidates.length) lines.push(`- △ 要検討（未追加）: ${p.mediumCandidates.map(c => `${c.id}(score${c.score})`).join(', ')}`);
  lines.push('');
});

fs.writeFileSync(path.join(__dirname, 'related_report.md'), lines.join('\n'), 'utf8');
console.error('related_report.md を出力しました');

const jsonOut = {
  generatedAt: new Date().toISOString(),
  statusCounts,
  resolvedFixes, removedRefs, dupRefs,
  perArticle,
};
fs.writeFileSync(path.join(__dirname, 'related_analysis.json'), JSON.stringify(jsonOut, null, 2), 'utf8');
console.error('related_analysis.json を出力しました');
