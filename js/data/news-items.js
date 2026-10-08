/* ============================================================================
   news-items.js — 世界ニュースのデータ
   新しいニュースはこのファイルの末尾（配列の最後）に追加してください。

   設計方針:
   - ニュースは「出来事が発生した日」を持たない。
     updated は、あくまで「この資料を更新した日」を表す。
   - 一覧は updated の新しい順に表示される（news.js側でソートする）。
   - category は CATEGORIES（00-categories.js）の key と揃える
     （例: 'tech' / 'nation' / 'mutant' など）。ニュース専用の分類は作らない。
   - relatedArticleIds / relatedNationIds / relatedHistoryIds はすべて配列。
     単数形にしない（複数の国家・記事にまたがるニュースがあり得るため）。
   - relatedArticleIds・relatedNationIds は ARTICLES の id を指す
     （nation記事も ARTICLES の一部なので、articleById() で解決できる）。
   - relatedHistoryIds は現時点では未使用。TIMELINE（00-categories.js）の
     各エントリには id が存在しないため、参照できる先がまだ無い。
     枠だけ用意しておき、中身は空配列のままにしている。
   ============================================================================ */

const NEWS_ITEMS = [];

NEWS_ITEMS.push({
  id: 'news-001',
  title: 'セルトシティ、SNET中継設備の更新を発表',
  updated: '2026.09.17',
  category: 'tech',
  text: 'セルトシティは、通信基盤SNETの中継設備を順次更新すると発表した。既存の利用者への影響はほとんどなく、通信の安定性向上が見込まれるという。',
  relatedArticleIds: ['snet'],
  relatedNationIds: ['sertcity'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-002',
  title: 'キューマで新たな天翼紋の出土報告',
  updated: '2026.09.10',
  category: 'nation',
  text: 'キューマの発掘チームが、天翼紋とみられる新たな刻印を発見したと報告した。詳細な分析はこれから行われる予定。',
  relatedArticleIds: [],
  relatedNationIds: ['kyuma'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-003',
  title: 'フーモラ各地で未知の「天翼紋」を確認',
  updated: '2026.09.17',
  category: 'science',
  text: 'フーモラ・スカイピル各地で、未知の紋様「天翼紋」の確認例が相次いでいる。建築物の表面や空路構造物、空間投影など様々な場所で観測されているが、現在もその意味や起源、目的は明らかになっていない。',
  relatedArticleIds: ['fumora-skypill'],
  relatedNationIds: ['fumora-skypill'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-004',
  title: 'チリルド・アイルツアで雪が停止、原因は不明',
  updated: '2026.09.17',
  category: 'nation',
  text: 'チリルド・アイルツアで、建国以来続いていた雪が突如として止まる異常事態が発生している。現在のところ原因は明らかになっていない。大規模な混乱には至っていないものの、長く続いてきた白景の変化を受け、国民の間では不安が広がっている。',
  relatedArticleIds: [],
  relatedNationIds: ['chiriludo-ailtsua'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-005',
  title: 'ニポラン、関西封鎖区の監視を継続',
  updated: '2026.09.17',
  category: 'mutant',
  text: 'ニポランでは、12年前の関西変異災害によって封鎖された旧首都周辺の監視が現在も続けられている。S.V.H.を中心に封鎖区の管理が行われており、災害は現在も完全には終息していない。',
  relatedArticleIds: ['niporan'],
  relatedNationIds: ['niporan'],
  relatedHistoryIds: ['kansai-mutant-disaster']
});

NEWS_ITEMS.push({
  id: 'news-006',
  title: 'S.V.H.、世界各国の変異体対策を継続',
  updated: '2026.09.17',
  category: 'mutant',
  text: 'ニポラン発祥の対変異体組織S.V.H.は、世界各国の支部と連携し、変異体情報の管理や対応基準の策定、作戦指揮などを行っている。現在では国際危機管理機関として各国の変異体対策を支えている。',
  relatedArticleIds: ['niporan'],
  relatedNationIds: ['niporan'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-007',
  title: 'ニポラン、人間による最終判断の方針を維持',
  updated: '2026.09.17',
  category: 'nation',
  text: 'ニポランでは、人間の人生に関わる最終判断をAIへ委ねない方針が維持されている。過去に試験運用されたAI裁判員制度は、人間性や情状を完全に扱えない問題から廃止されており、現在も最終判断は人間が担っている。',
  relatedArticleIds: ['niporan'],
  relatedNationIds: ['niporan'],
  relatedHistoryIds: []
});
