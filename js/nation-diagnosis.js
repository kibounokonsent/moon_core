/* ==========================================================================
   国家適性診断  #/diagnosis/nation
   --------------------------------------------------------------------------
   13問の質問に答えると、未来世界の国家のうち「暮らしが合いそうな国」を提示する。
   ・各回答は国家ごとに点数を加算し、満点（その国が取りうる最大点）に対する割合で比較する
   ・全15か国（崩壊領域マイモックを含む）が結果に出る
   ・ガルヒューラ／マイモックは danger:true として警告つきで表示する
   ・国家の名前・色・旗・概要は ARTICLES（js/data/nations/*.js）から読む
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. 国家プロフィール（キーは記事 id）
   -------------------------------------------------------------------------- */

const NDIAG_NATIONS = {
  'larliafrus': {
    slogan:'自然と共存',
    fit:'自然の流れに身をまかせ、急がずに暮らせる人。手を加えすぎず、森の循環の一部として生きる感覚が、あなたの回答に強く表れていました。',
    life:'朝は窓を開けて森の空気を吸い、夜は月脈樹の光を眺めながら眠る。発光するヒカリタケの灯りで過ごす、静かで深い暮らし。',
    note:'森の循環を乱す行為には厳しい国です。便利さより調和を優先できるかが大切です。'
  },
  'orgaron': {
    slogan:'創造',
    fit:'正解のないものを形にしたい人。決まりごとより表現を、完成より「つくり続けること」を大切にする姿勢が見られました。',
    life:'インクの飛んだアトリエで目を覚まし、運河沿いを歩いて劇場へ。街中の誰もが何かを描き、奏で、つくっている毎日。',
    note:'表現が日常の国です。ぼんやり暮らしていると、いつの間にか作品の一部にされているかもしれません。'
  },
  'belnea': {
    slogan:'生命を知り、共に生きる',
    fit:'生き物そのものへの好奇心と、命を尊重する気持ちを持つ人。観察し、理解し、共に生きようとする回答が目立ちました。',
    life:'熱帯・砂漠・極地・海洋……ドームごとに異なる環境のなかで、生命の営みを観察しながら暮らす。',
    note:'研究と保全が最優先の国です。ドーム内の生態系に関わるルールは細かく決められています。'
  },
  'wonhead': {
    slogan:'共に暖かく',
    fit:'誰かと食卓を囲む時間を何より大切にする人。人を喜ばせること、みんなで分け合うことに価値を感じる傾向がありました。',
    life:'湯気の立つ屋台街を抜けて、大鍋を囲む夕食へ。「食べること」がそのまま人とのつながりになる、あたたかい暮らし。',
    note:'食事を断ることは少し失礼にあたる国です。おなかには余裕を持って。'
  },
  'sanrudo': {
    slogan:'価値を流し続ける',
    fit:'駆け引きと取引を楽しめる人。約束を重んじながら、価値の動きを読み、チャンスをつかみにいく姿勢が見られました。',
    life:'黄金区と白金区のあいだを行き来し、夜は仮面をつけて社交の場へ。契約と信用がすべてを動かす、華やかな毎日。',
    note:'契約は絶対の国です。書類にサインする前に、内容はよく読みましょう。'
  },
  'kyuma': {
    slogan:'探究とロマン',
    fit:'失われたものにロマンを感じ、それを自分の目で確かめたい人。過去を「保存」ではなく「体験」したい気持ちが強く出ていました。',
    life:'発掘現場から蒸気機関車で街へ戻り、復元された古代の遺物に囲まれて眠る。過去と現在が混ざり合う暮らし。',
    note:'砂嵐の多い土地です。発掘品の持ち出しには許可が必要です。'
  },
  'chiriludo-ailtsua': {
    slogan:'変わらぬ白景',
    fit:'変わらないものに安らぎを感じ、ゆっくりした時間を愛せる人。急がず、美しい景色を守りたいという回答が目立ちました。',
    life:'降り続ける雪を眺めながら、大きくてもふもふの雪犬と過ごす。氷の彫刻が数百年分の白景を残す、悠然とした暮らし。',
    note:'一年中雪の国です。寒さに強いこと、そしてせっかちでないことが大切です。'
  },
  'tasumenio': {
    slogan:'世界を繋ぐ海',
    fit:'人と人、場所と場所をつなぐことに喜びを感じる人。開かれた心で、さまざまな人と関わろうとする姿勢が見られました。',
    life:'海を望む家から、テレポート中継塔で世界のどこへでも。行き交う人々を温かく迎える、港町の暮らし。',
    note:'世界中から人が集まる国です。「温かい態度」は、この国の大切な文化のひとつです。'
  },
  'yuretsuea': {
    slogan:'時を超えて共に',
    fit:'ひとつの物を長く大切にできる人。精密な仕事と、物と共に時間を重ねることへの愛着が、あなたの回答に表れていました。',
    life:'時計塔の鐘とともに工房へ向かい、預かった道具を修理する。何十年も使い続けた物に囲まれた、丁寧な暮らし。',
    note:'物を雑に扱う人は少し嫌われます。壊れたら、まず直すことを考えましょう。'
  },
  'fumora-skypill': {
    slogan:'空と共に生きる',
    fit:'身軽さと自由を愛し、決まった形にとらわれない人。新しいものや異なる文化を楽しめる柔軟さが見られました。',
    life:'雲海の上の回転都市で、エアポッドに乗って空中の街を移動する。多文化が混ざり合う、自由な空の暮らし。',
    note:'成層圏の都市です。高いところが苦手な人には、少しだけ勇気が要ります。'
  },
  'niporan': {
    slogan:'国家前進',
    fit:'秩序を大切にし、仲間や国のために前へ進もうとする人。責任感と、守るべきもののために行動する意志が強く出ていました。',
    life:'畳の部屋で行灯を灯し、朝は塔の見える街へ。伝統と最先端が並ぶ街で、世界を支える仕事に関わる暮らし。',
    note:'S.V.H.中央本部のある国です。有事には、国全体が一丸となって動きます。'
  },
  'sertcity': {
    slogan:'ネットの安全、世界の安全。',
    fit:'データと論理で物事を判断できる人。感情より正確さを、混乱より管理された秩序を好む傾向が見られました。',
    life:'管理された光のなかで目を覚まし、現実とサイバー世界を行き来しながら、世界のネットワークを支える。',
    note:'入国審査が非常に厳しい閉鎖型都市です。適性があっても、住めるかどうかは別の話です。'
  },
  'hubert': {
    slogan:'世界を理解し、未来を構築する',
    fit:'世界の仕組みを理解し、それを未来に活かしたい人。合理的に考え、知識を積み上げていく姿勢が強く表れていました。',
    life:'白い研究都市で、猫と一緒に暮らす。最先端の生命科学に囲まれた、合理的で快適な毎日。',
    note:'猫がとても多い国です。猫が苦手な場合は、慣れるところから始めましょう。'
  },
  'garhyura': {
    slogan:'強さこそ正義',
    danger:true,
    fit:'力で道を切り開き、勝ち残ることに価値を感じる人。厳しい環境でも折れない強さと、競争を恐れない意志が強く表れていました。',
    life:'凍てつく大地で、干し肉と最低限の装備だけを頼りに生き抜く。赤い空の下、強い者だけが認められる日々。',
    note:'一度入国すると、出国はほぼ不可能とされる国家です。外部ネットワークも届きません。本当に強さに自信がある人以外には、おすすめできません。'
  },
  'maimok': {
    slogan:'', status:'国家機能消失 ・ 崩壊領域',
    danger:true,
    fit:'何かに縛られることなく、ただ流れに身をまかせていたい人。目的や責任から離れて、ぼんやりと漂うことへの憧れが表れていました。',
    life:'ピンクの霧が漂う廃ホテルの一室で、甘い煙に包まれて時間を忘れる。物は散らかり、生活の気配はほとんどない。',
    note:'ここは国家ではなく崩壊領域です。霧への依存によって、一度住み着いた人はほとんど出てきません。適性があっても、決して近づかないでください。'
  }
};


/* --------------------------------------------------------------------------
   2. 質問（scores のキーは記事 id）
   -------------------------------------------------------------------------- */

const NDIAG_QUESTIONS = (() => {
const L = 'larliafrus', O = 'orgaron', B = 'belnea', W = 'wonhead', S = 'sanrudo',
      K = 'kyuma', C = 'chiriludo-ailtsua', T = 'tasumenio', Y = 'yuretsuea',
      F = 'fumora-skypill', N = 'niporan', SE = 'sertcity', H = 'hubert', G = 'garhyura', M = 'maimok';

return [
  { q:'朝、目が覚めて最初にしたいことは？', a:[
    { t:'窓を開けて、外の空気を思いきり吸う',         scores:{[L]:3, [B]:1, [C]:1} },
    { t:'温かい朝ごはんを、誰かと一緒に食べる',       scores:{[W]:3, [T]:1} },
    { t:'端末で、今日の予定と世界のニュースを確認する', scores:{[SE]:2, [H]:2, [N]:1} },
    { t:'昨日の作業の続きに、すぐ取りかかる',         scores:{[O]:3, [Y]:1} }
  ]},
  { q:'あなたが一番大切にしている持ち物は？', a:[
    { t:'何年も手入れしながら使い続けている道具',     scores:{[Y]:3, [K]:1} },
    { t:'最新の端末やデバイス',                       scores:{[H]:2, [SE]:2, [F]:1} },
    { t:'特にない。身軽なのが一番',                   scores:{[F]:3, [T]:1, [M]:2} },
    { t:'自分でつくった作品',                         scores:{[O]:3, [C]:1} }
  ]},
  { q:'理想の休日の過ごし方は？', a:[
    { t:'遺跡や古い街並みを巡り歩く',                 scores:{[K]:3, [Y]:1} },
    { t:'市場や劇場など、人の多い場所で遊ぶ',         scores:{[S]:3, [T]:1, [O]:1} },
    { t:'静かな場所で、何もしない時間を過ごす',       scores:{[C]:3, [L]:1, [M]:1} },
    { t:'気になっている研究や勉強を進める',           scores:{[H]:2, [B]:2} }
  ]},
  { q:'住むなら、どんな景色の見える場所がいい？', a:[
    { t:'雲の上。空がどこまでも広がるところ',         scores:{[F]:3, [SE]:1} },
    { t:'海と、行き交う船が見えるところ',             scores:{[T]:3, [W]:1} },
    { t:'雪が静かに降り積もるところ',                 scores:{[C]:3, [G]:1} },
    { t:'深い森と、その奥に光る大樹が見えるところ',   scores:{[L]:3, [B]:1} }
  ]},
  { q:'仕事で、一番やりがいを感じるのは？', a:[
    { t:'社会や国を、前へ進められたとき',             scores:{[N]:3, [H]:1} },
    { t:'大きな取引がまとまったとき',                 scores:{[S]:3, [T]:1} },
    { t:'目の前の誰かが喜んでくれたとき',             scores:{[W]:3, [Y]:1} },
    { t:'誰も知らなかったことを解き明かしたとき',     scores:{[H]:2, [K]:2, [B]:1} }
  ]},
  { q:'思いがけないトラブルが起きました。あなたは？', a:[
    { t:'自分の力で、真正面からねじ伏せる',           scores:{[G]:3, [N]:1} },
    { t:'冷静にデータを集めて、原因を分析する',       scores:{[SE]:3, [H]:1} },
    { t:'みんなで集まって、話し合って決める',         scores:{[W]:2, [T]:2} },
    { t:'慌てない。たいていのことは時間が解決する',   scores:{[C]:2, [L]:2, [M]:1} }
  ]},
  { q:'理想の夕食は？', a:[
    { t:'大鍋を囲んで、みんなでわいわい',             scores:{[W]:3, [N]:1} },
    { t:'栄養まで計算された、合理的な一皿',           scores:{[H]:3, [SE]:1} },
    { t:'森や畑で採れたばかりのもの',                 scores:{[L]:3, [B]:1} },
    { t:'仮面をつけて訪れる、きらびやかな晩餐会',     scores:{[S]:3, [O]:1} }
  ]},
  { q:'一番心に響く言葉は？', a:[
    { t:'「まだ誰も見たことのないものをつくりたい」', scores:{[O]:3, [F]:1} },
    { t:'「失われたものを、もう一度この目で見たい」', scores:{[K]:3, [Y]:1} },
    { t:'「長く一緒にいたものほど、愛おしい」',       scores:{[Y]:3, [C]:1} },
    { t:'「勝った者だけが、生き残る」',               scores:{[G]:3, [S]:1} }
  ]},
  { q:'どんな生き物と暮らしたい？', a:[
    { t:'気まぐれな猫と',                             scores:{[H]:3, [W]:1} },
    { t:'暮らすより、いろいろな生き物を観察したい',   scores:{[B]:3, [L]:1} },
    { t:'大きくてもふもふの犬と',                     scores:{[C]:3, [G]:1} },
    { t:'生き物より、機械やAIのほうが落ち着く',       scores:{[SE]:3, [Y]:1, [M]:1} }
  ]},
  { q:'好きな移動手段は？', a:[
    { t:'テレポートで、一瞬で目的地へ',               scores:{[T]:3, [SE]:1} },
    { t:'空を飛ぶ船で、雲の上を行く',                 scores:{[F]:3, [N]:1} },
    { t:'自分の足で、景色を見ながら歩く',             scores:{[L]:2, [O]:2, [C]:1} },
    { t:'鉄道に揺られて、ゆっくりと',                 scores:{[K]:2, [Y]:2} }
  ]},
  { q:'ルールや決まりごとについて、どう思う？', a:[
    { t:'きっちり守られている方が安心する',           scores:{[N]:3, [SE]:1} },
    { t:'少ない方がいい。自由が一番',                 scores:{[F]:3, [O]:1, [M]:2} },
    { t:'一度交わした約束は、何があっても守るもの',   scores:{[S]:3, [Y]:1} },
    { t:'人の決まりより、自然の流れに従いたい',       scores:{[L]:2, [B]:2} }
  ]},
  { q:'あなたが一番守りたいものは？', a:[
    { t:'自分の国と、仲間たち',                       scores:{[N]:3, [G]:1} },
    { t:'美しい景色',                                 scores:{[C]:3, [L]:1} },
    { t:'世界中の人のつながり',                       scores:{[T]:3, [SE]:1, [F]:1} },
    { t:'生命そのもの',                               scores:{[B]:3, [H]:1} }
  ]},
  { q:'眠れない夜、あなたはどうする？', a:[
    { t:'甘い香りの煙に包まれて、ぼんやりと過ごす',   scores:{[M]:3, [S]:1} },
    { t:'眠れないなら、体を鍛える',                   scores:{[G]:3, [N]:1} },
    { t:'窓から、月や雪や星を眺める',                 scores:{[C]:2, [L]:1, [F]:1} },
    { t:'遠くの誰かに連絡して、話をする',             scores:{[T]:2, [W]:1, [SE]:1} }
  ]}
];
})();

/* --------------------------------------------------------------------------
   3. 状態
   -------------------------------------------------------------------------- */

const ndiagState = { step:0, answers:[], done:false };

function ndiagReset(){ ndiagState.step = 0; ndiagState.answers = []; ndiagState.done = false; }

function ndiagArticle(id){ return ARTICLES.find(a => a.id === id); }

/* --------------------------------------------------------------------------
   4. 判定
   -------------------------------------------------------------------------- */

function ndiagCompute(){
  const ids = Object.keys(NDIAG_NATIONS);
  const raw = {}, best = {};
  ids.forEach(id => { raw[id] = 0; best[id] = 0; });

  NDIAG_QUESTIONS.forEach((q, i) => {
    const opt = q.a[ndiagState.answers[i]];
    Object.keys(opt.scores).forEach(k => { raw[k] += opt.scores[k]; });
    ids.forEach(id => { best[id] += Math.max(...q.a.map(o => o.scores[id] || 0)); });
  });

  // 国ごとに加点される機会の数が違うため、満点に対する割合で比べる
  const pct = {};
  // 危険地域は、はっきり傾いたときだけ上位に来るよう少し控えめに数える
  ids.forEach(id => { pct[id] = best[id] ? Math.round(raw[id] / best[id] * 100 * (NDIAG_NATIONS[id].danger ? .9 : 1)) : 0; });

  // 同点なら素点の高い方、それも同じなら回答から決まる順序
  let seed = 0;
  ndiagState.answers.forEach((n, i) => { seed += (n + 1) * (i + 3); });
  const order = ids.slice().sort((a, b) =>
    (pct[b] - pct[a]) || (raw[b] - raw[a]) || ((tdHashSafe(a + seed) - tdHashSafe(b + seed))));

  const ranked = order.filter(id => ndiagArticle(id));
  return { pct, raw, ranked };
}

function tdHashSafe(s){
  let h = 2166136261;
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* --------------------------------------------------------------------------
   5. 描画
   -------------------------------------------------------------------------- */

function renderNationDiagnosisPage(container){
  const body = ndiagState.done ? ndiagResultHtml() : ndiagQuestionHtml();
  container.innerHTML = `
    <section class="diag-page ndiag-page">
      <header class="diag-page__header">
        <span class="diag-page__eyebrow">NATION APTITUDE</span>
        <h1>国家適性診断</h1>
        <p class="diag-page__desc">13の質問に答えると、未来世界のなかで、あなたの暮らし方と相性のよい国家が見つかるかもしれません。移住相談のつもりで、気軽にどうぞ。</p>
      </header>
      ${body}
    </section>`;
  window.scrollTo({ top:0 });
}

function ndiagQuestionHtml(){
  const total = NDIAG_QUESTIONS.length;
  const i = ndiagState.step;
  const q = NDIAG_QUESTIONS[i];
  const pct = Math.round((i / total) * 100);
  return `
    <div class="diag-card">
      <div class="diag-progress"><div class="diag-progress__bar" style="width:${pct}%"></div></div>
      <div class="diag-step">質問 ${i + 1} / ${total}</div>
      <h2 class="diag-question">${q.q}</h2>
      <div class="diag-options">
        ${q.a.map((o, n) => `<button type="button" class="diag-option" onclick="ndiagAnswer(${n})">${o.t}</button>`).join('')}
      </div>
      <div class="diag-actions">
        ${i > 0 ? '<button type="button" class="btn btn-ghost" onclick="ndiagBack()">← 前の質問へ</button>' : ''}
      </div>
    </div>`;
}

function ndiagSlogan(p){ return p.slogan ? `「${p.slogan}」` : (p.status || ''); }

function ndiagFlag(a, cls){
  return a.flagUrl
    ? `<img class="${cls}" src="${a.flagUrl}" alt="${a.title}の国旗" loading="lazy">`
    : `<span class="${cls} ndiag-flag--none"></span>`;
}

function ndiagResultHtml(){
  const r = ndiagCompute();
  const topId = r.ranked[0];
  const top = ndiagArticle(topId);
  const p = NDIAG_NATIONS[topId];
  const color = top.accentColor || '#1F6BFF';

  const runners = r.ranked.slice(1, 3).map(id => {
    const a = ndiagArticle(id), np = NDIAG_NATIONS[id];
    return `
      <a class="ndiag-runner" href="#/article/${id}" style="--nc:${a.accentColor || '#1F6BFF'}">
        ${ndiagFlag(a, 'ndiag-runner__flag')}
        <span class="ndiag-runner__body">
          <span class="ndiag-runner__pct">相性 ${r.pct[id]}%</span>
          <span class="ndiag-runner__name">${a.title}</span>
          <span class="ndiag-runner__slogan">${ndiagSlogan(np)}</span>
        </span>
      </a>`;
  }).join('');

  const shown = r.ranked.slice(0, 6);
  const max = Math.max(1, ...shown.map(id => r.pct[id]));
  const bars = shown.map((id, k) => {
    const a = ndiagArticle(id);
    return `
      <div class="diag-bar ndiag-bar ${k === 0 ? 'is-top' : ''}" style="--nc:${a.accentColor || '#1F6BFF'}">
        <div class="diag-bar__label">${a.title}</div>
        <div class="diag-bar__track"><div class="diag-bar__fill" style="width:${Math.round(r.pct[id] / max * 100)}%"></div></div>
        <div class="ndiag-bar__num">${r.pct[id]}%</div>
      </div>`;
  }).join('');

  const danger = p.danger ? `
        <div class="ndiag-danger">⚠ 警告：この地域への移住はおすすめできません</div>` : '';

  return `
    <div class="diag-result">
      <div class="diag-card diag-card--main ndiag-main" style="--nc:${color}">
        <div class="ndiag-main__band"></div>
        <div class="diag-result__eyebrow">診断結果</div>
        <div class="diag-result__label">あなたに合いそうな国家</div>${danger}
        <div class="ndiag-main__head">
          ${ndiagFlag(top, 'ndiag-main__flag')}
          <div>
            <h2 class="diag-result__company">${top.title}</h2>
            <div class="ndiag-main__slogan">${ndiagSlogan(p)}</div>
          </div>
          <div class="ndiag-main__pct"><span>${r.pct[topId]}</span>%</div>
        </div>
        <p class="diag-result__lede">${top.lede}</p>
        <h3 class="ndiag-h">あなたとの相性</h3>
        <p class="diag-result__relation">${p.fit}</p>
        <h3 class="ndiag-h">こんな暮らしが待っています</h3>
        <p class="diag-result__relation">${p.life}</p>
        <p class="ndiag-main__note"><span>${p.danger ? '注意' : '移住のヒント'}</span>${p.note}</p>
        <div class="diag-actions">
          <a class="btn btn-primary ndiag-btn" href="#/article/${topId}">${top.title}の資料を読む</a>
          <a class="btn btn-ghost" href="#/room/${topId}">${top.title}の部屋をのぞく</a>
        </div>
      </div>

      <div class="diag-card">
        <h3 class="diag-h">ほかに相性のよい国家</h3>
        <div class="ndiag-runners">${runners}</div>
      </div>

      <div class="diag-card">
        <h3 class="diag-h">国家ごとの相性 <span class="diag-h__sub">上位6か国</span></h3>
        <div class="diag-bars">${bars}</div>
      </div>

      <div class="diag-card diag-card--links">
        <a class="btn btn-ghost" href="#/world-map">世界地図で見る</a>
        <a class="btn btn-ghost" href="#/category/nation">国家の一覧</a>
        <a class="btn btn-ghost" href="#/diagnosis">企業適性診断もやってみる</a>
        <button type="button" class="btn btn-ghost" onclick="ndiagRestart()">もう一度診断する</button>
      </div>

      <p class="diag-disclaimer">この診断は、あなたの暮らし方と各国の文化・価値観との相性を見る、未来世界の移住適性分析です。ガルヒューラ・マイモックが出た場合は、資料をよく読んでから考えてください。実際の入国・移住には、各国の審査が必要です。</p>
    </div>`;
}

/* --------------------------------------------------------------------------
   6. 操作
   -------------------------------------------------------------------------- */

function ndiagRerender(){ renderNationDiagnosisPage(document.getElementById('app')); }

function ndiagAnswer(n){
  ndiagState.answers[ndiagState.step] = n;
  if(ndiagState.step + 1 >= NDIAG_QUESTIONS.length) ndiagState.done = true;
  else ndiagState.step += 1;
  ndiagRerender();
}

function ndiagBack(){
  if(ndiagState.step > 0){
    ndiagState.step -= 1;
    ndiagState.answers.length = ndiagState.step;
    ndiagRerender();
  }
}

function ndiagRestart(){ ndiagReset(); ndiagRerender(); }
