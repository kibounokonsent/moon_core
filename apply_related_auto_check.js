/*
 使い方: node analyze_related.js を実行した直後に
        node apply_related_auto_check.js を実行する。
 related_analysis.json の内容（resolvedFixes / removedRefs / perArticle.autoAdded）を
 実データの related:[...] に反映する。本文・sections・admin には一切触れない。
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'moon_core');
const ANALYSIS_PATH = path.join(__dirname, 'related_analysis.json');

if (!fs.existsSync(ANALYSIS_PATH)) {
  console.error('related_analysis.json が見つかりません。先に node analyze_related.js を実行してください。');
  process.exit(1);
}
const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf8'));

function listDataFiles(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(listDataFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}
const files = listDataFiles(path.join(ROOT, 'js', 'data'));

function findArticleBlock(content, articleId) {
  const idPatterns = [`id:'${articleId}'`, `id:"${articleId}"`];
  let idIdx = -1;
  for (const p of idPatterns) {
    const i = content.indexOf(p);
    if (i !== -1) { idIdx = i; break; }
  }
  if (idIdx === -1) return null;
  const nextPushIdx = content.indexOf('ARTICLES.push(', idIdx + 1);
  const searchEnd = nextPushIdx === -1 ? content.length : nextPushIdx;
  const relIdx = content.indexOf('related:[', idIdx);
  if (relIdx === -1 || relIdx > searchEnd) return null;
  const closeIdx = content.indexOf(']', relIdx);
  return { relIdx, closeIdx };
}

function parseRelatedArray(str) {
  const inner = str.slice(str.indexOf('[') + 1, str.lastIndexOf(']'));
  return inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

// articleId -> {removeRefs:Set, addIds:Set}
const plan = {};
function ensure(id) { if (!plan[id]) plan[id] = { removeRefs: new Set(), addIds: new Set() }; return plan[id]; }

(analysis.resolvedFixes || []).forEach(f => {
  const p = ensure(f.ownerId);
  p.removeRefs.add(f.ref);
  p.addIds.add(f.target);
});
(analysis.removedRefs || []).forEach(r => {
  ensure(r.ownerId).removeRefs.add(r.ref);
});
Object.entries(analysis.perArticle || {}).forEach(([id, p]) => {
  (p.autoAdded || []).forEach(add => ensure(id).addIds.add(add));
});

// related フィールド自体が存在しない記事に自動追加する場合は related:[...] を新規追加する必要がある
function addRelatedFieldIfMissing(content, articleId, ids) {
  const idPatterns = [`id:'${articleId}'`, `id:"${articleId}"`];
  let idIdx = -1;
  for (const p of idPatterns) { const i = content.indexOf(p); if (i !== -1) { idIdx = i; break; } }
  if (idIdx === -1) return content;
  const nextPushIdx = content.indexOf('ARTICLES.push(', idIdx + 1);
  const blockEnd = nextPushIdx === -1 ? content.length : nextPushIdx;
  // ARTICLES.push({ ... }); の最後の `});` の直前に related:[...] を挿入する
  const closeIdx = content.lastIndexOf('});', blockEnd);
  if (closeIdx === -1) return content;
  const insertion = `\n  related:[${ids.map(v => `'${v}'`).join(',')}],`;
  return content.slice(0, closeIdx) + insertion + '\n' + content.slice(closeIdx);
}

let changedFiles = 0, fixCount = 0, removeCount = 0, addCount = 0, newFieldCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;

  Object.keys(plan).forEach(articleId => {
    if (!content.includes(`id:'${articleId}'`) && !content.includes(`id:"${articleId}"`)) return;
    const { removeRefs, addIds } = plan[articleId];

    let block = findArticleBlock(content, articleId);
    if (!block && addIds.size > 0) {
      // related:[...] 自体が存在しない → 新規に追加する
      content = addRelatedFieldIfMissing(content, articleId, [...addIds]);
      newFieldCount++;
      addCount += addIds.size;
      fileChanged = true;
      return;
    }
    if (!block) return;

    const relStr = content.slice(block.relIdx, block.closeIdx + 1);
    let arr = parseRelatedArray(relStr);

    removeRefs.forEach(ref => {
      const idx = arr.indexOf(ref);
      if (idx !== -1) { arr.splice(idx, 1); removeCount++; }
    });
    addIds.forEach(id => {
      if (!arr.includes(id)) { arr.push(id); addCount++; }
    });
    arr = [...new Set(arr)];

    const newRelStr = `related:[${arr.map(v => `'${v}'`).join(',')}]`;
    content = content.slice(0, block.relIdx) + newRelStr + content.slice(block.closeIdx + 1);
    fileChanged = true;
  });

  if (fileChanged) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.error(`更新: ${path.relative(ROOT, file)}`);
  }
}

fixCount = (analysis.resolvedFixes || []).length;
console.error(`完了: ${changedFiles}ファイル更新 / 修正${fixCount}件・削除${removeCount}件・追加${addCount}件（うちrelated新設${newFieldCount}記事）`);
console.error('反映後は node analyze_related.js を再実行して確認してください。');
