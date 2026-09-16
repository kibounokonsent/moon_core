/*
 使い方:
   1. サイトの管理画面 #/admin/related で修正・候補を選び、「変更をエクスポート」で
      related_decisions.json をダウンロードする
   2. そのファイルをこのスクリプトと同じフォルダに置く
   3. node apply_related_decisions.js を実行する
      → moon_core/js/data/ 以下の該当ファイルの related:[...] が書き換わる

 このスクリプトは related:[...] の配列リテラルをテキストとして書き換えるだけで、
 記事の本文（sections等）には一切触れない。
*/
const fs = require('fs');
const path = require('path');
const glob = require('path');

const ROOT = path.join(__dirname, 'moon_core');
const DECISIONS_PATH = path.join(__dirname, 'related_decisions.json');

if (!fs.existsSync(DECISIONS_PATH)) {
  console.error('related_decisions.json が見つかりません。管理画面からエクスポートしたファイルをこのフォルダに置いてください。');
  process.exit(1);
}

const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));

// 対象になりうる全データファイルを収集
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

// articleId -> {file, startIdx, endIdx} で related:[...] の位置を特定するため、
// シンプルに「id:'xxx'」を含むブロック内で最初に出てくる related:[ ... ] を対象にする
function findArticleBlock(content, articleId) {
  const idPatterns = [`id:'${articleId}'`, `id:"${articleId}"`];
  let idIdx = -1;
  for (const p of idPatterns) {
    const i = content.indexOf(p);
    if (i !== -1) { idIdx = i; break; }
  }
  if (idIdx === -1) return null;
  // このidブロックの終わり（次の ARTICLES.push または NATION_DATA的な次オブジェクト）までを範囲とする
  const nextPushIdx = content.indexOf('ARTICLES.push(', idIdx + 1);
  const searchEnd = nextPushIdx === -1 ? content.length : nextPushIdx;
  const relIdx = content.indexOf('related:[', idIdx);
  if (relIdx === -1 || relIdx > searchEnd) return null;
  const closeIdx = content.indexOf(']', relIdx);
  return { relIdx, closeIdx };
}

function parseRelatedArray(str) {
  // "related:['a','b']" の中身をゆるく配列にする
  const inner = str.slice(str.indexOf('[') + 1, str.lastIndexOf(']'));
  return inner
    .split(',')
    .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

let changedFiles = 0;
let appliedFixes = 0;
let appliedAdditions = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let fileChanged = false;

  // このファイルに関係する記事IDだけを対象に処理（fixesとaddedCandidatesの両方から集める）
  const articleIds = new Set();
  Object.values(decisions.fixes || {}).forEach(f => articleIds.add(f.articleId));
  Object.keys(decisions.addedCandidates || {}).forEach(id => articleIds.add(id));

  articleIds.forEach(articleId => {
    if (!content.includes(`id:'${articleId}'`) && !content.includes(`id:"${articleId}"`)) return;

    const block = findArticleBlock(content, articleId);
    if (!block) {
      console.error(`[警告] ${articleId} の related:[...] が見つかりませんでした（${path.relative(ROOT, file)}）。手動で確認してください。`);
      return;
    }
    const relStr = content.slice(block.relIdx, block.closeIdx + 1);
    let arr = parseRelatedArray(relStr);

    // fixes を適用（apply=置換 / remove=削除 / keep=何もしない）
    Object.values(decisions.fixes || {}).forEach(f => {
      if (f.articleId !== articleId) return;
      const idx = arr.indexOf(f.ref);
      if (idx === -1) return;
      if (f.action === 'apply' && f.value) { arr[idx] = f.value; appliedFixes++; }
      else if (f.action === 'remove') { arr.splice(idx, 1); appliedFixes++; }
      // action === 'keep' は何もしない
    });

    // 候補の追加
    const toAdd = (decisions.addedCandidates || {})[articleId] || [];
    toAdd.forEach(id => {
      if (!arr.includes(id)) { arr.push(id); appliedAdditions++; }
    });

    // 重複除去
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

console.error(`完了: ${changedFiles}ファイルを更新（修正${appliedFixes}件・追加${appliedAdditions}件）`);
console.error('反映後は node analyze_related.js を再実行して整合性を確認してください。');
