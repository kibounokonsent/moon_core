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
  id: 'news-008',
  title: 'ヲンヘード　ホットドッグの暴発',
  updated: '2026.10.06',
  category: 'nation',
  text: 'ヲンヘード市内の飲食店で、調理中のホットドッグが予想外の勢いで破裂する騒ぎがあった。けが人はなく、店側は原因を調査している。',
  relatedArticleIds: ['wonhead'],
  relatedNationIds: ['wonhead'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-009',
  title: 'ヒューバート　猫の日宣言286日目',
  updated: '2026.10.04',
  category: 'nation',
  text: 'ヒューバートで続いている「猫の日宣言」が286日目を迎えた。開始以降、毎日猫に関する話題が発信されており、現在も宣言終了の予定は発表されていない。',
  relatedArticleIds: ['hubert'],
  relatedNationIds: ['hubert'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-010',
  title: '永久凍土から新種の細菌が発見される',
  updated: '2026.10.02',
  category: 'tech',
  text: '極寒地域の永久凍土を調査していた研究チームが、これまで確認されていなかった細菌を発見した。現在は性質や生態への影響について詳しい分析が進められている。',
  relatedArticleIds: [],
  relatedNationIds: [],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-011',
  title: 'タスメニオ　海鳴りが三日連続',
  updated: '2026.10.01',
  category: 'nation',
  text: 'タスメニオ周辺の海域で、通常とは異なる海鳴りが三日連続で観測されている。現在のところ大きな被害は確認されておらず、原因について調査が行われている。',
  relatedArticleIds: ['tasumenio'],
  relatedNationIds: ['tasumenio'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-012',
  title: 'ベルネア　環境ドームで新たな生態系調査を開始',
  updated: '2026.09.29',
  category: 'tech',
  text: 'ベルネアの環境ドームの一部で、新たな生態系調査が始まった。複数の生物種が共存する環境を長期的に観察し、生命の相互関係について研究する。',
  relatedArticleIds: ['belnea'],
  relatedNationIds: ['belnea'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-013',
  title: 'チリルド・アイルツア　雪が止まった地域で調査続く',
  updated: '2026.09.27',
  category: 'tech',
  text: 'チリルド・アイルツアで発生した降雪停止を受け、各地で気象観測が続けられている。長年続いてきた降雪環境の変化について、専門家による調査が進められている。',
  relatedArticleIds: ['chiriludo-ailtsua'],
  relatedNationIds: ['chiriludo-ailtsua'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-014',
  title: 'フーモラ・スカイピル　空中都市の気象観測を強化',
  updated: '2026.09.25',
  category: 'tech',
  text: 'フーモラ・スカイピルでは、各地の気象変化に対応するため観測体制の強化が行われている。世界規模の気象安定システムへの影響についても確認が進められている。',
  relatedArticleIds: ['fumora-skypill'],
  relatedNationIds: ['fumora-skypill'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-016',
  title: 'キューマ　古代遺物の復元作業が進む',
  updated: '2026.09.22',
  category: 'tech',
  text: 'キューマの研究施設で、発掘された古代遺物の復元作業が進められている。保存だけでなく、当時の状態を再現することを目指した研究が続けられている。',
  relatedArticleIds: ['kyuma'],
  relatedNationIds: ['kyuma'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-017',
  title: 'ラリアフルス　森林地域で生態調査',
  updated: '2026.09.21',
  category: 'tech',
  text: 'ラリアフルスの森林地域で、自然環境と生物の循環について調査が行われている。長期的な環境変化を記録するための観測も続けられている。',
  relatedArticleIds: ['larliafrus'],
  relatedNationIds: ['larliafrus'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-018',
  title: 'オルガロン　新たな芸術祭が開幕',
  updated: '2026.09.20',
  category: 'nation',
  text: 'オルガロンで新たな芸術祭が開幕した。絵画や彫刻、映像など幅広い表現が集まり、国内外から多くの制作者が参加している。',
  relatedArticleIds: ['orgaron'],
  relatedNationIds: ['orgaron'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-019',
  title: 'サンルド　新たな投資市場を公開',
  updated: '2026.09.19',
  category: 'nation',
  text: 'サンルドで新たな投資市場が公開された。複数の分野を対象とした取引が行われる予定で、国内外から注目を集めている。',
  relatedArticleIds: ['sanrudo'],
  relatedNationIds: ['sanrudo'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-020',
  title: 'ユーレツェア　長期稼働を想定した時計を発表',
  updated: '2026.09.18',
  category: 'tech',
  text: 'ユーレツェアの工匠が、長期間の使用を想定した新型時計を発表した。精密さと耐久性を重視した設計となっている。',
  relatedArticleIds: ['yuretsuea'],
  relatedNationIds: ['yuretsuea'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-021',
  title: 'セルトシティ　旧型情報設備の交換が進む',
  updated: '2026.09.16',
  category: 'tech',
  text: 'セルトシティで、旧型の情報設備を新しい設備へ交換する作業が進められている。都市内部のネットワークを維持しながら段階的に更新される予定。',
  relatedArticleIds: ['sertcity'],
  relatedNationIds: ['sertcity'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-022',
  title: 'ニポラン　変異体情報の共有基準を更新',
  updated: '2026.09.15',
  category: 'mutant',
  text: 'ニポランで、変異体に関する情報を各国間で共有するための基準が更新された。S.V.H.を中心に各国との情報連携が進められている。',
  relatedArticleIds: ['niporan'],
  relatedNationIds: ['niporan'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-023',
  title: 'マイモック　霧の濃度に変化を確認',
  updated: '2026.09.14',
  category: 'tech',
  text: 'マイモックの一部地域で、継続的に発生している霧の濃度に変化が確認された。現在、環境への影響について観測が続けられている。',
  relatedArticleIds: ['maimok'],
  relatedNationIds: ['maimok'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-024',
  title: 'タスメニオ　テレポート中継網の定期点検を実施',
  updated: '2026.09.12',
  category: 'tech',
  text: 'タスメニオで、世界各地を結ぶテレポート中継網の定期点検が行われている。一部の中継施設では短時間の運用変更が予定されている。',
  relatedArticleIds: ['tasumenio'],
  relatedNationIds: ['tasumenio'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-025',
  title: 'ヲンヘード　秋の食文化行事が各地で開催',
  updated: '2026.09.11',
  category: 'nation',
  text: 'ヲンヘード各地で、秋の食文化をテーマとした行事が開催されている。地域ごとの料理や食習慣を紹介する催しが行われ、多くの市民が参加している。',
  relatedArticleIds: ['wonhead'],
  relatedNationIds: ['wonhead'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-026',
  title: 'ベルネア　環境ドームの一部を一般公開',
  updated: '2026.09.09',
  category: 'nation',
  text: 'ベルネアで、研究対象となっている環境ドームの一部が期間限定で一般公開された。来訪者はドーム内の生態環境を観察できる。',
  relatedArticleIds: ['belnea'],
  relatedNationIds: ['belnea'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-027',
  title: 'キューマ　新たな古代文明の資料を公開',
  updated: '2026.09.08',
  category: 'tech',
  text: 'キューマの研究機関が、新たに発見された古代文明の資料の一部を公開した。資料の意味については現在も研究が続けられている。',
  relatedArticleIds: ['kyuma'],
  relatedNationIds: ['kyuma'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-028',
  title: 'フーモラ・スカイピル　空路の一部を変更',
  updated: '2026.09.06',
  category: 'nation',
  text: 'フーモラ・スカイピルで、空中都市周辺の空路の一部が変更された。都市間の交通や気象状況を考慮した調整だという。',
  relatedArticleIds: ['fumora-skypill'],
  relatedNationIds: ['fumora-skypill'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-029',
  title: 'オルガロン　保存されていた作品群を再展示',
  updated: '2026.09.05',
  category: 'nation',
  text: 'オルガロンで、長期間保存されていた芸術作品の再展示が始まった。過去の表現を現在の文化の中で見直す機会として注目されている。',
  relatedArticleIds: ['orgaron'],
  relatedNationIds: ['orgaron'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-030',
  title: 'ユーレツェア　古い工房設備の修復が完了',
  updated: '2026.09.03',
  category: 'nation',
  text: 'ユーレツェアで、歴史的な工房設備の修復が完了した。現在も使用可能な状態まで整備され、技術資料として公開される予定。',
  relatedArticleIds: ['yuretsuea'],
  relatedNationIds: ['yuretsuea'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-031',
  title: 'ヲンヘード　泳ぐホットドッグの開発が進む',
  updated: '2026.09.03',
  category: 'nation',
  text: 'ヲンヘードで、泳ぐホットドッグの開発が進んでいる。今後の展開が注目されている。',
  relatedArticleIds: ['wonhead'],
  relatedNationIds: ['wonhead'],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-032',
  title: 'ゲーミングフルフード　七色に光り輝くゲーミングフルフルフードが発売される',
  updated: '2026.10.07',
  category: 'life',
  text: '七色に光り輝くゲーミングフルフルフードが発売された。かつて発光タイプが姿を消した経緯もあり、今回の商品がどう受け止められるかが注目されている。',
  relatedArticleIds: ['gaming-full-food'],
  relatedNationIds: [],
  relatedHistoryIds: []
});

NEWS_ITEMS.push({
  id: 'news-033',
  title: 'ラリアフルス　オーバーキル串焼きで配信者が噴き出し炎上',
  updated: '2026.10.08',
  category: 'culture',
  text: 'ラリアフルスの激辛料理「オーバーキル串焼き」を食べていた配信者が、配信中に噴き出す場面があり、映像が拡散して批判が集まっている。',
  relatedArticleIds: ['overkill-skewer', 'larliafrus'],
  relatedNationIds: ['larliafrus'],
  relatedHistoryIds: []
});