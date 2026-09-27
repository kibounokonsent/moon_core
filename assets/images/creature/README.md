# 生物（creature）用の画像フォルダ

このフォルダに「生物」カテゴリーの画像ファイルを追加してください。

記事データ（js/data.js）の該当する記事オブジェクトに、以下のように `image` フィールドを追加すると、記事ページの上部に自動で表示されます。

```js
image: 'assets/images/creature/ファイル名.jpg',↓
assets/images/creature/plants/.png
assets/images/creature/animals/.png
assets/images/creature/marine/.png
```

画像ファイルがまだ無い状態でも、サイトはエラーにならず問題なく表示されます
（画像が見つからない場合は自動的に非表示になります）。

※ フォルダ名は当初のままです。plants＝植物、animals＝陸上生物、marine＝水生生物（海・川・湖・氷の下など）として使います。
菌類・微生物（ヒカリタケ・喰木茸など）の画像は、既存の記事のパスに合わせて plants フォルダに置いたままで問題ありません。
