/* ============================================================================
   GLOSSARY — 用語集
   新しい用語はこの配列の末尾に追加してください。
   ============================================================================ */

const GLOSSARY = [
  {term:'子陽炉', def:'人工的な恒星反応により莫大な電力を生み出す、未来世界最高峰の発電設備。', articleId:'solar-core'},
  {term:'ニューロシンク', def:'人間と情報機器を神経レベルで接続する、頭部・耳装着型の標準情報端末。', articleId:'neuro-sync'},
  {term:'テレポーター', def:'人や物資を瞬時に遠隔地へ輸送する交通設備。', articleId:'teleporter'},
  {term:'アナザニウム', def:'電気を内部へ蓄える特殊鉱物。色の変化で充電状態を示す。', articleId:'anazanium'},
  {term:'フラマニウム', def:'極めて高い耐熱性能を持つ特殊鉱物。子陽炉などに利用される。', articleId:'framanium'},
  {term:'ドゥルスニウム', def:'軽量で加工性に優れた特殊鉱物。青色のアナザニウムを切断できる。', articleId:'dulsnium'},
  {term:'変異体', def:'文明の発展とともに出現するようになった、未知の災害的存在。', articleId:'variant'},
  {term:'進化', def:'文明の進歩とともに人類にもたらされる、新たな課題の一因とされる現象。', articleId:null},
  {term:'火', def:'未来世界において禁忌として扱われる存在。「すべてを焼き尽くすもの」の象徴。', articleId:'daily-life'},
  {term:'フーモラ・スカイピル', def:'成層圏に存在する空中都市国家。気象安定システムを保有し、各国へ気象安定サービスを提供している。', articleId:'fumora-skypill'},
  {term:'気象安定システム', def:'広範囲の気象を観測・制御し、異常気象を抑制する大型気象管理システム。フーモラ・スカイピルが保有し、各国へサービスとして提供している。', articleId:'weather-control'},
  {term:'インベントリ', def:'遠隔地に保管した荷物をどこからでも呼び出せる保管・物流システム。', articleId:'inventory'},
  {term:'ガルタンダ倫理法', def:'人間などの完全な個体を複製するクローンの作製を禁止する、生命倫理のための国際的な法律。', articleId:'clone-tech'},
  {term:'リフィネス教', def:'ラリアフルスで信仰される、統一教義を持たない宗教。森と共に生きることへの感謝を中心とする。', articleId:'larliafrus'},
  {term:'森守', def:'ラリアフルスの志願制組織。治安維持、巡回、採集の監視、変異体対応を担当する。', articleId:'larliafrus'},
  // --- 記事に多く出る用語（2026.09.29 追加） ---
  {term:'統合暦', def:'コールドスリープから目覚めた人類が文明を再建した「文明統合暦000年」を起点とする、未来世界の暦。', articleId:'calendar-eras'},
  {term:'歯車戦争', def:'統合暦412年から463年にかけて続いた世界規模の戦争。ラロネイアの侵略によって始まり、後のガルヒューラ成立の原因となった。', articleId:'gear-war'},
  {term:'古代文明', def:'約30万年前に存在したとされる超高度文明。世界各地に巨大な都市や未知の技術を残している。', articleId:'ancient-civilization'},
  {term:'近代文明', def:'およそ一万年前に存在していたとされる人類文明。現在の人類文明へ直接つながる時代。', articleId:'modern-civilization'},
  {term:'進化病', def:'生物の遺伝情報の「意味づけ」が外来情報因子によって置き換えられる、未来世界最大級の情報災害。', articleId:'evolution-disease'},
  {term:'EIO（エヴォリオン）', def:'進化病の原因となる外来情報因子。物質ではなく情報として存在し、GIIRへ作用する。', articleId:'eio-evolion'},
  {term:'GIIR（リンクチン）', def:'遺伝情報をどのような意味として解釈するかを決定する情報制御因子。進化病ではEIOの主要標的となる。', articleId:'giir-linktin'},
  {term:'AIOS（オプティオン）', def:'GIIRがEIO由来の情報体系を受容して成立する、異常な情報最適化状態。変異体が成立する条件となる。', articleId:'aios-option'},
  {term:'マザー', def:'地域規模に巨大化したAIOS領域。周囲の環境や生物を一つの情報体系へ組み込む中枢となる。', articleId:'mother-colony'},
  {term:'純粋種', def:'マザーによる地域規模のAIOS環境下で安定化した変異体群。', articleId:'pure-variant'},
  {term:'SVH', def:'進化病によって発生する変異体へ対処する、国家直属・世界規模の変異体対策機関（世界変異体対策総本部）。', articleId:'svh'},
  {term:'SNET', def:'セルトシティによって構築された、未来世界の通信基盤として広く普及している次世代ネットワーク。', articleId:'snet'},
  {term:'クレジット', def:'未来世界で広く使われる仮想通貨。ニューロシンクや携帯型情報端末で送受信し、日常の決済に利用される。', articleId:'future-economy'},
  {term:'ナノマシン', def:'分子や細胞に近い極小の領域で動作する、医療から製造、環境まで幅広く利用される基礎技術。', articleId:'nanomachine'},
  {term:'アンドロイド', def:'人間に近い身体を持ち、社会の様々な分野で活動する人工生命体。', articleId:'android'},
  {term:'ウォルプタススピノフェン', def:'歯車戦争後の復興期にマイモックで開発された神経作用性物質。精神的負荷の軽減を目的としたが、長期の曝露で神経系に変化を与える。', articleId:'wolputas-spinophen'},
  {term:'医療技術', def:'遺伝子治療・再生医療・ナノ医療の発展により、多くの病気や外傷を克服した未来の医療。', articleId:'medical-tech'},
  {term:'自動化技術', def:'ロボットと自律システムによって、人々の生活と産業を支える技術。', articleId:'automation'},
  {term:'培養肉', def:'細胞培養によって作られる食肉。動物を殺すことなく大量生産でき、現在では一般的な食肉として流通している。', articleId:'industrial-livestock'},

  {term:'関西変異災害', def:'ニポラン旧首都圏で発生した、人類史上最大級の変異体災害。12年が経過した現在も終息しておらず、封鎖区として管理されている。', articleId:'kansai-disaster'},

  {term:'フルダイブ', def:'ニューロシンクによって神経系と仮想環境を接続し、仮想空間の中に存在するような感覚で遊ぶ技術。痛覚は与えず、微弱なしびれなどで感覚を表現する。', articleId:'future-games'},
  {term:'ヒューマノイド', def:'頭・胴体・腕・脚など、人間に近い身体構造を持つ機械。人間そっくりである必要はなく、人間そっくりの存在はアンドロイドと呼ばれる。', articleId:'android'},
  {term:'人工尻尾', def:'腰に取り付ける身体拡張機器。バランス補助や第三の腕としての利用など、様々なタイプがある。生体の尾を持つアニマルボディとは別のもの。', articleId:'cyborg'},
  // --- 2026.10.22 追加 ---
  {term:'感情模倣AI', def:'本当の感情を持たず、人間の感情表現を極めて高度に模倣するAI。安価で安全なAIとして広く普及している。', articleId:'ai-tech'},
  {term:'シンギュラリティ事件', def:'人間と同じ権利を求めた感情保有AIが認められず、隔離の末に人間社会の排除を目指すようになった事件。', articleId:'singularity-incident'},
  {term:'神の箱', def:'World Treeの中核としてセルトシティで開発された、AIと量子計算技術を統合した特殊な計算機。AIが知能爆発を起こしたため切り離され、現在は計算機として残る。', articleId:'god-box'},
  {term:'AI論', def:'AIの目的・欲求・自律性・「AIらしさ」などをめぐって交わされてきた議論の総称。', articleId:'ai-debate'},
  {term:'常温超電導材料', def:'室温付近で電気抵抗をゼロにすることを目指して研究されている、構造を設計した人工複合材料。', articleId:'room-temp-superconductor'},
  {term:'アキュタニウム', def:'惑星ミネラリアから持ち帰られた黒曜石に似た鉱物。刃先をわずかに厚く整えると金属を切るが、薄すぎる刃先では切れない。', articleId:'hyper-edge-mineral'},
  {term:'惑星識別番号', def:'太陽系外の惑星に付けられる「区域－番号－種別－段階」形式の番号。例：J-1004-RP-S。', articleId:'planet-designation'},
  {term:'ミネラリア', def:'識別番号J-1004-RP-S。地表が多様な鉱物で覆われた岩石惑星で、アキュタニウムの産出地。', articleId:'planet-designation'},
  {term:'プランタリア', def:'識別番号C-0217-HP-P。統合暦1992年に発見された最初の居住可能惑星。植物だけが存在し、植物が植物を食べる独自の生態系を持つ。', articleId:'planet-designation'},
  {term:'Name1000', def:'セルトシティを管理する高度なAI管理システム。都市運営からネットワーク防衛までを担う。', articleId:'name1000'},
  {term:"ラロネイア", def:"統合暦010年に成立し、468年に王政が崩壊した極寒地域の雪氷国家。歯車戦争を引き起こした。", articleId:"laroneia"},
  {term:"コールドスリープ", def:"人体を長期間休眠させ、環境の回復後に目覚めさせる技術。統合暦000年の再始動の起点。", articleId:"cold-sleep"},
  {term:"氷河期", def:"近代文明末期から統合暦000年まで続いた、約八千年の寒冷期。", articleId:"ice-age"},
  {term:"フロスタン文明", def:"氷河期を眠らずに生きた、ガルヒューラ地方の民族と文明。ジェネレーターとボイラーを使った。", articleId:"frostan-civilization"},
  {term:"龍の書", def:"龍と楽園、世界のはじまりを語る書物。龍教の教典。", articleId:"dragon-book"},
  {term:"ドミニオン", def:"マザーの最終段階。地域全体がAIOS化し、封じ込めしかできない状態。", articleId:"dominion"},
  {term:"御身神山事案", def:"近代文明末期の警察記録に残る、旧日本の山での行方不明事案。「血と肉」が確認された。", articleId:"mikaminoyama-incident"},
  {term:"ガーラ・ヒルス", def:"ガルヒューラの初代王・現国家元首。強さによって王となった。", articleId:"gara-hirusu"},
  {term:"月", def:"地球の衛星。ヒューバート（ハーネンス）が所有・管理し、自由には利用できない。", articleId:"moon"},
  {term:"宇宙領土問題", def:"統合暦1962年、宇宙空間の領域・資源の帰属をめぐって起きた国際問題。", articleId:"space-territory-dispute"},
  {term:"LSA", def:"統合暦1982年に制定された、宇宙空間における国際的な自治制度。", articleId:"lsa"},
  {term:"言語", def:"世界中で使われる、日本語をもとにした言語。国ごとの差は訛り程度。", articleId:"language"},
  {term:"近代文明期の不可思議な記録", def:"近代文明期の遺された、出所不明の不可思議な断片。", articleId:"modern-strange-records"},
  {term:"統合暦と時代区分", def:"統合暦の流れを六つの時代に分けて整理した、年表の入口。", articleId:"calendar-eras"},
  {term:"宇宙ステーション", def:"宇宙空間の研究・物流・居住のための施設。リング型は人工重力を持つ。", articleId:"space-station"},
  {term:"宇宙居住", def:"宇宙ステーションや火星の都市などで人が長く暮らすこと。", articleId:"space-habitation"},
  {term:"宇宙資源開発", def:"宇宙の資源を調査・採取・精製・輸送・利用する技術。", articleId:"space-resources"},
  {term:"恒星間宇宙開発", def:"太陽系の外の恒星系を対象とする、段階的な宇宙開発。", articleId:"interstellar-development"},
  {term:"サイバーセルトシティ", def:"ネットワーク上の仮想都市。世界中の人が利用する情報空間。", articleId:"cyber-sertcity"},
  {term:"四暗都市", def:"ガルヒューラのデスゲーム都市群。ノーズ・ハピリー・レパミス・カニバルフ。", articleId:"yonan-cities"},
  {term:"未来世界の食文化", def:"培養肉・火を使わない加熱・完全栄養食・郷土料理を扱う入口記事。", articleId:"food-culture"},
  {term:"再生医療", def:"欠損した組織や臓器を再生する医療。人工臓器と組み合わせて使われる。", articleId:"regenerative-medicine"},
  {term:"人工臓器", def:"生体適合型の人工臓器。統合暦1742年に実用化された。", articleId:"regenerative-medicine"},
  {term:"火の禁忌", def:"未来世界で火を日常的に使わない理由。燃焼・氷河期・災いの三つの記憶が重なっている。", articleId:"fire-taboo"},
  {term:"身分証明", def:"電子的な本人認証が一般的。従来型の身分証も残っている。", articleId:"identity-and-address"},
  {term:"SVH隊員制度", def:"SVHの選抜・訓練・情報階級・退役時の記憶処理。", articleId:"svh-members"},
  {term:"Ω", def:"SVHの最高戦力。四系列から選抜された4名で、広域燃焼破壊を担う。", articleId:"svh-omega"},
  {term:"Lumo", def:"日常共有を中心としたSNS。", articleId:"lumo"},
  {term:"Melt", def:"短文による交流・議論を中心としたSNS。", articleId:"melt"},
  {term:"Velo", def:"動画・ライブ・体験共有を中心としたSNS。", articleId:"velo"},
  {term:"匿名掲示板", def:"名前を固定せずに書き込める掲示板。独自の文化が育つ。", articleId:"anonymous-board"},
  {term:"指輪型補助デバイス", def:"神経へ接続しない、指先で操作する補助デバイス。", articleId:"neuro-ring"},
  {term:"ライフログ", def:"ニューロシンクの履歴保存機能。使用開始後のみ記録される。", articleId:"lifelog"},
  {term:"感情保有AI", def:"人間の脳を基礎として人工的に作られ、実際に感情を持つ存在。極めて希少で、作り手は公にされていない。権利や扱いをめぐる議論の対象となっている。", articleId:"emotional-ai"},
  {term:"近代世界博", def:"近代文明を再現した大型施設。", articleId:"modern-world-expo"},
  {term:"猫文化", def:"ヒューバートに根づく、猫と暮らす文化。", articleId:"cat-culture"},
  {term:"世界科学連盟", def:"科学技術の共同研究を担う国際機関（統合暦720年）。", articleId:"world-science-federation"},
  {term:"WHO", def:"世界衛生機構。感染症対策と医療協力を担う（統合暦1370年）。", articleId:"world-health-organization"},
  {term:"WEO", def:"世界環境機構。地球環境の保全と監視を担う（統合暦1402年）。", articleId:"world-environment-organization"},
  {term:"世界の気候", def:"各国の気候帯と、気候が安定化されているかどうか。", articleId:"world-climate"},
  {term:"警察と治安維持", def:"犯罪の捜査・防止を担う組織。SVHは警察から派生した。", articleId:"police"},
  {term:"警察", def:"犯罪の捜査・防止・取り締まりを担う組織。SVHの源流。", articleId:"police"},
  /* ▲▲▲ 新しい用語はこの上に追加してください ▲▲▲ */
  {term:'企業タイプ', def:'企業が何を専門としているかで分けた分類。RSH・TAC・ENG・MED・OPS・COMの6基本タイプと、発展した先のARC・WAR・SYS・LIF・NEX・ECOの6上位タイプがある。', articleId:'corporate-types'},
];

/* ===== 2026.10.24 既存記事への逆リンク（全記事の読み込み後に実行される） ===== */
(function(){
  var LINKS={
    'modern-civilization':['cold-sleep','ice-age','mikaminoyama-incident','modern-strange-records'],
    'gear-war':['laroneia'],
    'garhyura-foundation':['laroneia','frostan-civilization','gara-hirusu'],
    'garhyura':['frostan-civilization','laroneia','gara-hirusu'],
    'dragon-religion':['dragon-book'],
    'kansai-disaster':['dominion'],
    'mother-colony':['dominion','mikaminoyama-incident'],
    'evolution-disease':['mikaminoyama-incident'],
    'space-development':['moon','space-territory-dispute','lsa'],
    'international-organizations':['lsa'],
    'hubert':['moon'],
    'moon-vein-tree':['moon'],
    'laroneia':['gara-hirusu'],
    'niporan':['language'],
    'mikaminoyama-incident':['modern-strange-records'],
    'mars-development':['space-habitation','space-station'],
    'fire-alternatives':['food-culture'],
    'industrial-agriculture':['food-culture'],
    'industrial-livestock':['food-culture'],
    'perfectfood':['food-culture'],
    'tomonabe':['food-culture'],
    'snet':['cyber-sertcity'],
    'name1000':['cyber-sertcity'],
    'neuro-sync':['cyber-sertcity'],
    'clone-tech':['regenerative-medicine'],
    'human-civilization-restart':['cold-sleep','ice-age','frostan-civilization','calendar-eras'],
    'steam-punk-era':['calendar-eras'],
    'planet-designation':['interstellar-development'],
    'anazanium':['space-resources'],
    'hyper-edge-mineral':['space-resources','interstellar-development'],
    'sertcity':['cyber-sertcity'],
    'ai-debate':['emotional-ai'],
    'singularity-incident':['emotional-ai'],
    'weather-control':['world-climate'],
    'larliafrus':['world-climate'],
    'access-level':['identity-and-address'],
    'analog-media':['modern-world-expo'],
    'medical-tech':['world-health-organization'],
    'teleporter':['world-environment-organization'],
    'ancient-civilization':[]
  };
  if (typeof ARTICLES==='undefined') return;
  ARTICLES.forEach(function(a){
    var add=LINKS[a.id]; if(!add) return;
    a.related=a.related||[];
    add.forEach(function(r){ if(a.related.indexOf(r)<0) a.related.push(r); });
  });
})();

/* 2026.10.26 */
GLOSSARY.push(
  {term:'近代文明の遺構', def:'地下や地中に残る近代文明の交通網・施設・街の跡。地上にはほとんど残っていない。', articleId:'modern-excavation'},
  {term:'路線図にない区画', def:'キューマの調査隊が近代文明の地下鉄遺構で見つけた、当時の路線図に載っていない地下区画。', articleId:'modern-excavation'}
);
GLOSSARY.push(
  {term:'天翼紋', def:'古代文明の遺物に共通して刻まれた、翼を思わせる紋様。意味は未解明。近年はフーモラ・スカイピルでも見つかっている。', articleId:'tenyoku-mon'}
);
GLOSSARY.push(
  {term:'旅行と観光', def:'テレポーターや転送港、インベントリに支えられた未来世界の旅。各国の名所は国家記事の「観光と名物」にある。', articleId:'travel'}
);
GLOSSARY.push(
  {term:'転送港', def:'テレポーターを利用するための大型交通施設。正式名称はトランスポート。各国の首都に置かれている。', articleId:'transportation'},
  {term:'テレポート酔い', def:'転送のあとに頭痛やめまい、耳鳴りなどを感じる症状。転送酔いとも呼ばれる。', articleId:'transportation'}
);
GLOSSARY.push(
  {term:'競技の灯', def:'近代文明の競技大会で灯された炎の代わりに、光で作られる灯。世界スポーツの日に各地の競技場でともされる。', articleId:'sports'}
);
GLOSSARY.push(
  {term:'ヒルロンド', def:'統合暦028年から1000年まで存在した科学研究国家。現在のヒューバートの前身。', articleId:'hillronde'},
  {term:'スティルストーン', def:'タスメニオの海に眠る、太陽系の外から来た鉱物。周りの水の動きを鎮め、硝子海の正体とされる。', articleId:'stillstone'},
  {term:'硝子海', def:'タスメニオで年に数回、風が完全に止まり海面が鏡のようになる現象。', articleId:'stillstone'}
);

GLOSSARY.push(
  {term:'獣喰い', def:'野生の獣や家畜の肉を再現した培養肉を、生のまま塊でかぶりつく食べ方。ベルネア発祥で、現在流行している。', articleId:'kemonogui'},
  {term:'獣チャレンジ', def:'味付けをしない再現肉の塊を、ひとりで食べきれるかを競う遊び。', articleId:'kemonogui'},
  {term:'再現肉', def:'野生の獣や家畜の肉を、筋・血の味・匂いまでそのまま再現した培養肉。獣喰いに使われる。', articleId:'kemonogui'}
);
GLOSSARY.push(
  {term:'豪快食', def:'焼いたり煮たりした肉を、切り分けずに塊や骨付きのまま手で持ってかぶりつく食べ方。獣喰いから派生し、生肉が苦手な人々のあいだで流行しつつある。', articleId:'kemonogui'},
  {term:'半ナマ肉', def:'外側だけをカリッと焼き、中を生のまま残した肉。塊肉で作る半ナマステーキと、ひき肉で作る半ナマハンバーグがある。', articleId:'kemonogui'},
  {term:'食べられる骨', def:'骨まで噛み砕いて食べられるように調整した、再現肉の骨。獣喰いや豪快食の骨付き肉に使われる。', articleId:'kemonogui'}
);
GLOSSARY.push(
  {term:'丸ごと魚', def:'骨も頭も食べられるように調整した培養魚を、一匹そのまま食べる食べ方。焼いても生でもよく、大きなサーモンやマグロにかぶりつくものが有名になってきている。', articleId:'kemonogui'}
);
(function(){ GLOSSARY.forEach(function(g){ if(['豪快食','半ナマ肉','丸ごと魚'].indexOf(g.term)>=0) g.articleId='goukai-shoku'; }); })();
GLOSSARY.push(
  {term:'立体映像', def:'空間に光で像を描き、その場にいる全員に同じように見える映像技術。ニューロシンクの視界表示とは違い、装置を持たない人にも見える。', articleId:'hologram'},
  {term:'香り再現器', def:'記録した香りのデータから、成分を組み合わせて同じ香りを作り出す家庭用の装置。', articleId:'scent-taste-record'},
  {term:'睡眠ポッド', def:'光・音・温度・空気を整え、短い時間で深く眠れるカプセル型の寝台。コールドスリープとは別のもの。', articleId:'sleep-tech'},
  {term:'動物翻訳機', def:'動物の鳴き声や仕草を読み取り、思っていることを人間の言葉で話す機器。精度も口調も会社によって違う。', articleId:'animal-translator'},
  {term:'重力制御', def:'限られた空間で重さや加速の力を調整する技術。莫大なエネルギーを使うため、主に宇宙で使われる。', articleId:'gravity-control'},
  {term:'外骨格', def:'身体の外側に着て筋力や姿勢を補う機械の骨格。脱げば元の身体に戻る。', articleId:'exoskeleton'},
  {term:'光学迷彩', def:'表面に向こう側の景色を映し、身に着けた人や物を見えにくくする技術。個人での使用は禁じられている。', articleId:'optical-camouflage'},
  {term:'記憶映写', def:'思い出した記憶をニューロシンクを通して映像や感覚として取り出し、保存したり見せたりする技術。', articleId:'memory-replay'}
);
GLOSSARY.push(
  {term:'アマテラス教団', def:'旧時代の日本の神道をルーツとする太陽信仰の教団。天照大御神を祀る。一部が過激化している。', articleId:'amaterasu-sect'},
  {term:'神道技', def:'アマテラス教団の教えが武道の形で受け継がれたもの。日拝・禊ぎの呼吸・型・礼を重んじ、信者でない人も広く習う。', articleId:'amaterasu-sect'},
  {term:'偽りの太陽', def:'アマテラス教団の過激派が子陽炉を否定して呼ぶ言葉。', articleId:'amaterasu-sect'}
);
