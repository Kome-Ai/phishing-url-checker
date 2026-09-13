# phishing-url-checker (Chrome/Edge拡張機能)

ページ内のリンクをホバー・クリックした際にURLのフィッシングリスクを判定し、
危険と判定されたURLへの遷移をブロックして警告する、Manifest V3のブラウザ拡張機能です。

判定ロジックはCLI版([../src/riskChecker.ts](../src/riskChecker.ts))をesbuildで
バンドルしてそのまま再利用しています。ロジックの詳細(ブランドなりすまし・
タイポスクワッティング・無料ホスティング検出)は[ルートのREADME](../README.md)を参照してください。

## 動作環境

**Microsoft Edge**を主要な動作対象として開発しています(企業利用を想定)。
`chrome.*`のようなブラウザ固有APIは使用しておらず標準DOM APIのみで実装しているため、
EdgeはChromiumベースでManifest V3に完全対応しており**無変更でそのまま動作**します。
Google Chromeでも同様に動作します。

## 機能

- **ホバー時**: リンクにマウスを乗せると、判定が「注意」以上の場合にカーソル付近へ
  警告バッジ(🟡注意 / 🔴危険 + 理由)を表示します。
- **クリック時**: 判定が「危険」の場合のみ`preventDefault()`で遷移をブロックし、
  警告モーダルを表示します。「キャンセル(推奨)」で中断、「リスクを理解して続行」を
  選んだ場合のみ本来の遷移を実行します。「注意」判定はバッジ表示のみでブロックしません。

## ビルド方法

拡張機能自体はリポジトリに`content.js`(ビルド済み)を含めているため、
ビルドなしでもそのまま読み込めます。ソース(`src/content.ts`や`../src/riskChecker.ts`)を
変更した場合は再ビルドしてください。

```bash
# リポジトリルートで実行
npm install
npm run build:extension       # 型チェック + content.js の再生成
npm run dev:extension         # ファイル変更を監視して自動再ビルド(開発時)
npm run generate:icons        # アイコンを再生成したい場合のみ
```

## Edgeへの読み込み手順(開発者モード)

1. Edgeのアドレスバーに `edge://extensions` と入力してEnter
2. 左側(または上部)の **「開発者モード」** をオンにする
3. **「展開して読み込み」** をクリック
4. このリポジトリの `extension` フォルダ(このREADMEがあるフォルダ)を選択
5. 拡張機能一覧に「Phishing URL Checker」(信号機アイコン)が表示され、
   エラーが出ていなければ読み込み成功

> Google Chromeの場合は `chrome://extensions` で同じ手順です。

## 動作確認用テストページ

判定4パターン(安全・ブランドなりすまし・タイポスクワッティング・無料ホスティング)を
含むテストページを用意しています。

```bash
npm run serve:test-page
# → http://localhost:5500/test-page.html をEdge/Chromeで開く
```

**注意**: `test-page.html`を`file://`で直接開くと、`manifest.json`の
`content_scripts.matches`が`http(s)://*`のみのためcontent scriptが注入されず、
拡張機能が動作しません(エラーも出ないため気づきにくい罠です)。必ず上記コマンドで
`http://localhost`経由で開いてください。

テストページ内のリンクは、実在の悪意あるドメインに誤って接続しないよう、
`example.com`/`example.net`(IANA予約ドメイン、ワイルドカードDNSなし)や
Firebase/Herokuの実インフラ上の未登録サブドメインを使っています。安全に
ブロック挙動を確認できます。

## エンタープライズ配布に向けて(企業のEdge端末への一括導入)

開発者モードでの手動読み込みではなく、組織のEdge端末に拡張機能を強制インストール・
固定配置したい場合は、Microsoft Edge の管理者向けポリシー(グループポリシー / Intune等)を使用します。

1. **拡張機能の配布先を用意する**
   - Chrome Web Store / Microsoft Edge Add-ons ストアに公開する(審査が必要)
   - または社内配布用に`.crx`をパッケージ化し、社内サーバーでホストする(ストア審査不要だが、
     Edgeの更新用XMLファイルの用意など別途設定が必要)
2. **`ExtensionInstallForcelist`ポリシーで強制インストール**
   - グループポリシー(`gpedit.msc`) → 「コンピューターの構成」→「管理用テンプレート」→
     「Microsoft Edge」→「拡張機能」→「Extension installation forcelist」を有効化し、
     `<拡張機能ID>;<更新用XMLのURL>`の形式で登録
   - Intune等のMDMを使う場合は、対応するポリシーテンプレート(OMA-URI)で同様の値を配布
3. **拡張機能IDの確認**
   - ストア公開後、または`.crx`パッケージ化後に発行されるID(32文字の英字)を使用
   - 開発者モードで読み込んだだけの拡張機能はID未確定のため、恒久配布には使えません

このドキュメントの範囲では実際のストア公開・ポリシー配布までは行っていません。
社内展開を具体的に進める場合は、公開先(社内限定 or 一般公開)や審査要否の方針を
決めた上で、別途対応します。

## 既知の限界

CLI版と同様の限界([ルートREADME](../README.md#既知の限界)参照)に加えて、拡張機能固有の制約もあります。

- Google Safe Browsing API等の外部脅威インテリジェンスとの連携は未実装(今後の拡張予定)
- `<iframe>`内のリンクは`all_frames: true`で監視対象ですが、Shadow DOM内に動的生成された
  リンクなど一部のDOM構造では検出漏れの可能性があります
- 拡張機能アイコンは簡易生成のプレースホルダーです(ブランドデザインの検討は別途)

## 今後の拡張予定

- Google Safe Browsing API との連携
- Chrome Web Store / Microsoft Edge Add-ons への公開
- 企業向けの一括配布ポリシー(`ExtensionInstallForcelist`)の具体的な設定手順の検証
