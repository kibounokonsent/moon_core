/* ==========================================================================
   企業適性診断（描画・判定ロジック）
   ルート: #/diagnosis

   設計方針:
   - 設問への回答を、既存の企業タイプ（RSH・TAC・ENG・MED・OPS・COM）の得点に変換する
   - 診断結果は「実在する企業」。企業タイプは各企業記事の info「企業タイプ」から読み取る
     （新しい企業に企業タイプを入れるだけで、診断の候補にも自動で加わる）
   - 基本タイプと上位タイプ（RSH→ARC など）は「系統」として同じ軸で扱う
   - 断定はせず、同じ企業タイプ・同じ系統の企業も合わせて紹介する
   - 設問・選択肢は下の DIAG_QUESTIONS を編集するだけで変更できる
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. 定義
   -------------------------------------------------------------------------- */

const DIAG_BASE = {
  RSH:'研究', TAC:'戦闘・防衛', ENG:'技術', MED:'医療', OPS:'情報', COM:'商業'
};
const DIAG_UPPER = {
  ARC:{ name:'知恵', base:'RSH' },
  WAR:{ name:'軍事', base:'TAC' },
  SYS:{ name:'文明', base:'ENG' },
  LIF:{ name:'生命', base:'MED' },
  NEX:{ name:'情報', base:'OPS' },
  ECO:{ name:'経済', base:'COM' }
};

// 診断の候補に含めない企業（現在は組織として機能していないもの）
const DIAG_EXCLUDE = ['gekaisis'];

// 設問。scores は選んだときに加点される企業タイプ。
// tier: 1 を選ぶと「分野全体を担う（上位タイプ寄り）」傾向が加点される。
const DIAG_QUESTIONS = [
  { q:'仕事で一番やりがいを感じるのは、どんな瞬間ですか？', a:[
    { t:'誰も知らなかった事実を、初めて突き止めた時', scores:{RSH:3, OPS:1} },
    { t:'守るべき人や場所を、守り切った時',           scores:{TAC:3, MED:1} },
    { t:'自分の作った仕組みが、思い通りに動いた時',   scores:{ENG:3, OPS:1} },
    { t:'目の前の誰かが、元気を取り戻した時',         scores:{MED:3, COM:1} }
  ]},
  { q:'休日は、どう過ごすことが多いですか？', a:[
    { t:'気になった疑問を、納得できるまで調べる',     scores:{RSH:3, ENG:1} },
    { t:'ニュースや記録を読み漁り、世の中の動きを追う', scores:{OPS:3, RSH:1} },
    { t:'古い機械や道具を分解して、直してみる',       scores:{ENG:3, RSH:1} },
    { t:'市場や店を巡って、人や品物との出会いを楽しむ', scores:{COM:3, OPS:1} }
  ]},
  { q:'チームの中で、自然と任されやすい役割は？', a:[
    { t:'状況を集めて整理し、全員に共有する役',       scores:{OPS:3, COM:1} },
    { t:'前に出て、危険を引き受ける役',               scores:{TAC:3, ENG:1} },
    { t:'誰かの不調に、最初に気づく役',               scores:{MED:3, OPS:1} },
    { t:'意見をまとめ、交渉や調整を進める役',         scores:{COM:3, OPS:1} }
  ]},
  { q:'正体不明の事態が起きたとき、あなたはまず何をしますか？', a:[
    { t:'原因を突き止めるため、現象を観察して調べる', scores:{RSH:3, OPS:1} },
    { t:'被害を抑えるため、すぐ現場へ向かう',         scores:{TAC:3, MED:1} },
    { t:'必要になりそうな道具や装置を、急いで用意する', scores:{ENG:3, TAC:1} },
    { t:'情報を集めて、関係者へ正確に伝える',         scores:{OPS:3, RSH:1} }
  ]},
  { q:'人から、どんな存在として頼られたいですか？', a:[
    { t:'どんな質問にも、正確な答えをくれる人',       scores:{OPS:3, RSH:1} },
    { t:'困ったとき、必ず助けてくれる人',             scores:{MED:3, TAC:1} },
    { t:'「これ、作れる？」に応えてくれる人',         scores:{ENG:3, COM:1} },
    { t:'いつも一番いい取引を結んでくれる人',         scores:{COM:3, OPS:1} }
  ]},
  { q:'一日の仕事の中で、一番長く時間を使いたいことは？', a:[
    { t:'現場を巡回して、異常がないか確かめること',   scores:{TAC:3, OPS:1} },
    { t:'相手の話を聞き、状態をていねいに見立てること', scores:{MED:3, COM:1} },
    { t:'数字や記録を読み解き、傾向を見つけること',   scores:{OPS:3, RSH:1} },
    { t:'設計図や試作品と向き合い、形にしていくこと', scores:{ENG:3, RSH:1} }
  ]},
  { q:'仕事の「報酬」として、一番うれしいものは？', a:[
    { t:'世の中の常識を変えるような発見',             scores:{RSH:3, ENG:1} },
    { t:'誰かからの、心からの感謝の言葉',             scores:{MED:3, COM:1} },
    { t:'取引がまとまったという、確かな成果',         scores:{COM:3, ENG:1} },
    { t:'今日も秩序が保たれたという、静かな安心',     scores:{TAC:3, OPS:1} }
  ]},
  { q:'思い描くキャリアは、どちらに近いですか？', tier:true, a:[
    { t:'ひとつの道を深く極め、その道の第一人者になる',       tier:0 },
    { t:'いくつもの分野を束ね、全体を動かす立場になる',       tier:1 }
  ]},
  { q:'関わりたい仕事の規模は？', tier:true, a:[
    { t:'目の届く範囲で、確かな仕事を積み重ねたい',           tier:0 },
    { t:'社会や国全体に影響するような、大きな仕事がしたい',   tier:1 }
  ]},
  { q:'肩書きにするなら、どちらがしっくりきますか？', tier:true, a:[
    { t:'「この分野の専門家」',                               tier:0 },
    { t:'「この分野そのものを代表する存在」',                 tier:1 }
  ]}
];

/* --------------------------------------------------------------------------
   2. 状態（ページを離れて戻っても、結果が残るようモジュール内で保持）
   -------------------------------------------------------------------------- */

const diagState = { step:0, answers:[], picks:{}, offset:0, done:false };

function diagReset(){
  diagState.step = 0;
  diagState.answers = [];
  diagState.offset = 0;
  diagState.done = false;
}

/* --------------------------------------------------------------------------
   3. 企業データ（記事の info「企業タイプ」から読み取る）
   -------------------------------------------------------------------------- */

function diagCodeOf(article){
  for(const sec of (article.sections || [])){
    for(const b of (sec.blocks || [])){
      if(b.t !== 'info') continue;
      for(const it of b.items){
        if(it.label === '企業タイプ'){
          const m = /【([A-Z]{3})】/.exec(it.value);
          if(m) return m[1];
        }
      }
    }
  }
  return null;
}

function diagFamily(code){ return DIAG_UPPER[code] ? DIAG_UPPER[code].base : code; }
function diagIsUpper(code){ return !!DIAG_UPPER[code]; }
function diagTypeName(code){ return DIAG_UPPER[code] ? DIAG_UPPER[code].name : DIAG_BASE[code]; }
function diagTypeLabel(code){ return `${code} / ${diagTypeName(code)}`; }

function diagCompanies(){
  return ARTICLES
    .filter(a => a.cat === 'org' && !DIAG_EXCLUDE.includes(a.id))
    .map(a => ({ id:a.id, title:a.title, lede:a.lede, code:diagCodeOf(a) }))
    .filter(c => c.code);
}

/* --------------------------------------------------------------------------
   4. 判定
   -------------------------------------------------------------------------- */

function diagCompute(){
  const score = { RSH:0, TAC:0, ENG:0, MED:0, OPS:0, COM:0 };
  let tier = 0;
  let seed = 0;

  DIAG_QUESTIONS.forEach((q, i) => {
    const opt = q.a[diagState.answers[i]];
    seed += (diagState.answers[i] + 1) * (i + 1);
    if(q.tier){ tier += opt.tier; return; }
    Object.keys(opt.scores).forEach(k => { score[k] += opt.scores[k]; });
  });

  // 設問ごとに各タイプへ加点される機会の数が違うため、満点に対する割合で比較する
  Object.keys(score).forEach(k => {
    let best = 0;
    DIAG_QUESTIONS.forEach(q => {
      if(q.tier) return;
      best += Math.max(...q.a.map(o => o.scores[k] || 0));
    });
    score[k] = Math.round(score[k] / best * 100);
  });

  // 同点のときは、回答内容から決まる順序で選ぶ（毎回同じ回答なら同じ結果）
  const keys = Object.keys(score);
  const max = Math.max(...keys.map(k => score[k]));
  const tops = keys.filter(k => score[k] === max);
  const family = tops[seed % tops.length];
  // 3問すべてで「分野全体を担う」側を選んだときだけ、上位タイプの企業を提示する
  const wantUpper = tier >= DIAG_QUESTIONS.filter(q => q.tier).length;

  const all = diagCompanies();
  const inFamily = all.filter(c => diagFamily(c.code) === family);
  let pool = inFamily.filter(c => diagIsUpper(c.code) === wantUpper);
  if(pool.length === 0) pool = inFamily;

  return { score, tier, seed, family, wantUpper, pool, inFamily };
}

/* --------------------------------------------------------------------------
   5. 描画
   -------------------------------------------------------------------------- */

function renderDiagnosisPage(container){
  const body = diagState.done ? diagResultHtml() : diagQuestionHtml();
  container.innerHTML = `
    <section class="diag-page">
      <header class="diag-page__header">
        <span class="diag-page__eyebrow">CAREER APTITUDE</span>
        <h1>企業適性診断</h1>
        <p class="diag-page__desc">いくつかの質問に答えると、あなたと相性のよい企業・企業タイプが見つかるかもしれません。未来世界の進路相談のつもりで、気軽にどうぞ。</p>
      </header>
      ${body}
    </section>`;
  window.scrollTo({ top:0 });
}

function diagQuestionHtml(){
  const total = DIAG_QUESTIONS.length;
  const i = diagState.step;
  const q = DIAG_QUESTIONS[i];
  const pct = Math.round((i / total) * 100);
  return `
    <div class="diag-card">
      <div class="diag-progress"><div class="diag-progress__bar" style="width:${pct}%"></div></div>
      <div class="diag-step">質問 ${i + 1} / ${total}</div>
      <h2 class="diag-question">${q.q}</h2>
      <div class="diag-options">
        ${q.a.map((o, n) => `<button type="button" class="diag-option" onclick="diagAnswer(${n})">${o.t}</button>`).join('')}
      </div>
      <div class="diag-actions">
        ${i > 0 ? '<button type="button" class="btn btn-ghost" onclick="diagBack()">← 前の質問へ</button>' : ''}
      </div>
    </div>`;
}

function diagResultHtml(){
  const r = diagCompute();
  const pool = r.pool;
  const rec = pool[(r.seed + diagState.offset) % pool.length];
  const code = rec.code;
  const typeName = DIAG_BASE[r.family];
  const upperCode = Object.keys(DIAG_UPPER).find(k => DIAG_UPPER[k].base === r.family);

  const sameType = diagCompanies().filter(c => c.code === code && c.id !== rec.id);
  const sameFamily = r.inFamily.filter(c => c.code !== code && c.id !== rec.id);

  const aptitude = diagIsUpper(code)
    ? `あなたは「${typeName}」分野、なかでもその分野全体を担う「${diagTypeName(code)}」（${code}）に近い領域との適性が高い傾向があります。`
    : `あなたは「${diagTypeName(code)}」分野との適性が高い傾向があります。`;

  const tierText = diagIsUpper(code)
    ? '分野全体を見渡し、大きな役割を担う働き方との相性も見られました。'
    : '専門を深く極める働き方との相性も見られました。';

  const relation = `回答では「${typeName}」に関わる項目が最も高く、${tierText}${rec.title}は、その分野に属する企業のひとつです。`;

  const maxScore = Math.max(1, ...Object.values(r.score));
  const bars = Object.keys(r.score)
    .sort((a, b) => r.score[b] - r.score[a])
    .map(k => `
      <div class="diag-bar ${k === r.family ? 'is-top' : ''}">
        <div class="diag-bar__label">${k}<span>${DIAG_BASE[k]}</span></div>
        <div class="diag-bar__track"><div class="diag-bar__fill" style="width:${Math.round(r.score[k] / maxScore * 100)}%"></div></div>
      </div>`).join('');

  const list = (arr) => `
    <ul class="diag-company-list">
      ${arr.map(c => `
        <li>
          <a href="#/article/${c.id}">
            <span class="diag-company-list__name">${c.title}</span>
            <span class="diag-company-list__type">${diagTypeLabel(c.code)}</span>
          </a>
        </li>`).join('')}
    </ul>`;

  return `
    <div class="diag-result">
      <div class="diag-card diag-card--main">
        <div class="diag-result__eyebrow">診断結果</div>
        <div class="diag-result__label">あなたに適性のある企業</div>
        <h2 class="diag-result__company">${rec.title}</h2>
        <div class="diag-result__type">
          <span class="diag-badge">企業タイプ：${diagTypeLabel(code)}</span>
        </div>
        <p class="diag-result__lede">${rec.lede}</p>
        <p class="diag-result__relation">${relation}</p>
        <div class="diag-actions">
          <a class="btn btn-primary" href="#/article/${rec.id}">${rec.title}の資料を読む</a>
          ${pool.length > 1 ? '<button type="button" class="btn btn-ghost" onclick="diagNext()">同じ傾向の別の企業も見る</button>' : ''}
        </div>
      </div>

      <div class="diag-card">
        <h3 class="diag-h">あなたの適性</h3>
        <p>${aptitude}</p>
        <div class="diag-bars">${bars}</div>
        <p class="diag-note">企業タイプの詳しい意味は <a href="#/article/corporate-types">「企業タイプとは」</a> で読めます。</p>
      </div>

      <div class="diag-card">
        <h3 class="diag-h">同じ企業タイプの企業 <span class="diag-h__sub">${diagTypeLabel(code)}</span></h3>
        ${sameType.length
          ? list(sameType)
          : '<p class="diag-empty">このタイプには、資料に記載のある他の企業はまだありません。下の「同じ系統の企業」もご覧ください。</p>'}
      </div>

      ${sameFamily.length ? `
      <div class="diag-card">
        <h3 class="diag-h">同じ系統の企業 <span class="diag-h__sub">${r.family} ⇄ ${upperCode}</span></h3>
        <p class="diag-note">${diagIsUpper(code) ? `${upperCode}は${r.family}（${typeName}）が発展した上位タイプです。` : `${r.family}（${typeName}）は、発展すると${upperCode}（${DIAG_UPPER[upperCode].name}）へ移行します。`}同じ系統の企業も、あわせて探してみてください。</p>
        ${list(sameFamily)}
      </div>` : ''}

      <div class="diag-card diag-card--links">
        <a class="btn btn-ghost" href="#/article/corporate-types">企業タイプとは</a>
        <a class="btn btn-ghost" href="#/category/org">組織・企業の一覧</a>
        <button type="button" class="btn btn-ghost" onclick="diagRestart()">もう一度診断する</button>
      </div>

      <p class="diag-disclaimer">この診断は、特定の企業があなたに向いていると断定するものではありません。あなたにはこの企業・この企業タイプとの適性があるかもしれない、という未来世界の適性分析です。</p>
    </div>`;
}

/* --------------------------------------------------------------------------
   6. 操作
   -------------------------------------------------------------------------- */

function diagRerender(){ renderDiagnosisPage(document.getElementById('app')); }

function diagAnswer(n){
  diagState.answers[diagState.step] = n;
  if(diagState.step + 1 >= DIAG_QUESTIONS.length){
    diagState.done = true;
    diagState.offset = 0;
  }else{
    diagState.step += 1;
  }
  diagRerender();
}

function diagBack(){
  if(diagState.step > 0){
    diagState.step -= 1;
    diagState.answers.length = diagState.step;
    diagRerender();
  }
}

function diagNext(){ diagState.offset += 1; diagRerender(); }
function diagRestart(){ diagReset(); diagRerender(); }
