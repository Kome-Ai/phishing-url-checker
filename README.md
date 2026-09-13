# phishing-url-checker

入力したURLのフィッシングリスクをスコアリングし、「安全」「注意」「危険」の
3段階で判定するCLIツールです。

## 概要

フィッシングサイトによくある特徴(有名ブランドへのなりすまし、綴りの酷似、
無料ホスティングの悪用)をルールベースで検出し、スコアを合算して判定を出します。
外部APIには依存せず、ローカルで完結して動作します。

## 構成

このリポジトリには、判定ロジック([src/riskChecker.ts](src/riskChecker.ts))を
共有する2つのアプリケーションが含まれています。

- **CLIツール**(このREADMEで説明): `src/` — ターミナルからURLを判定
- **Chrome/Edge拡張機能**: [extension/](extension/) — ページ内リンクのホバー/クリックを
  監視し、危険なURLへの遷移をブロック。詳細は [extension/README.md](extension/README.md) を参照

## インストール

Node.js 18以上が必要です。

```bash
npm install
```

## 使い方

```bash
# 開発時(TypeScriptのまま実行、複数URLをまとめて指定可能)
npm run dev -- https://example.com https://accounts-google-verify.com

# ビルドしてから実行
npm run build
npm start -- https://example.com
```

### 実行例

```
$ npm run dev -- https://accounts-google-verify.com

URL   : https://accounts-google-verify.com
ホスト: accounts-google-verify.com
判定  : 🔴 危険 (スコア: 60)
理由  :
  - [brand-impersonation] 有名ブランド「google」を含みますが、公式ドメイン(google.com, google.co.jp)と一致しません (+60)
```

終了コードは、判定に「危険」を含む場合は`2`、「注意」を含む場合は`1`、
すべて「安全」なら`0`を返します。CI等での自動チェックにも利用できます。

## 判定ロジック

以下の3つのルールを適用し、それぞれのスコアを合算して最終判定を出します。
実装は [src/riskChecker.ts](src/riskChecker.ts) を参照してください。

1. **ブランドなりすまし検出**(`checkBrandImpersonation`, 60点)
   `google` `amazon` `claude` 等の有名ブランド名がホスト名にトークンとして
   含まれているが、そのブランドの公式ドメイン(またはそのサブドメイン)と
   一致しない場合に警告します。ブランド一覧は [src/brands.ts](src/brands.ts) で管理。
   例: `accounts-google-verify.com`(公式は`google.com`)

2. **タイポスクワッティング検出**(`checkTyposquatting`, 50点)
   `goog1e.com` `paypa1-login.com` のように、有名ブランド名と編集距離
   (レーベンシュタイン距離)が1〜2文字程度しか離れていないドメインを検出します。
   距離計算は [src/levenshtein.ts](src/levenshtein.ts) を参照。
   例: `goog1e.com`(`google`との編集距離1)

3. **無料ホスティング検出**(`checkFreeHosting`, 30点)
   `firebaseapp.com` `herokuapp.com` 等、誰でも無料でサブドメインを
   取得できるホスティングサービス上のドメインの場合に注意を促します。
   一覧は [src/freeHosting.ts](src/freeHosting.ts) で管理。
   例: `phishing-example.firebaseapp.com`

### スコアとしきい値

| 判定 | 合計スコア |
| --- | --- |
| 🟢 安全 | 20点未満 |
| 🟡 注意 | 20点以上60点未満 |
| 🔴 危険 | 60点以上 |

| ルール | 単独スコア | 単独時の判定 |
| --- | --- | --- |
| ブランドなりすまし | 60点 | 🔴 危険 |
| タイポスクワッティング | 50点 | 🟡 注意 |
| 無料ホスティング | 30点 | 🟡 注意 |

タイポスクワッティングと無料ホスティングが重なる(50+30=80点)など、
2つ以上のルールに該当すると「危険」に引き上がります。しきい値・配点は
[src/riskChecker.ts](src/riskChecker.ts) の `SCORE` / `THRESHOLD` で調整できます。

## テスト

```bash
npm test
```

## 既知の限界

このツールはルールベースのヒューリスティックであり、完全な検出を保証するものではありません。

- **誤検知(False Positive)**: タイポスクワッティング検出は辞書チェックを行わないため、
  ブランド名とたまたま綴りが近い一般的な単語(例: `apple` に対する `ample.com`)を
  誤検知することがあります。単独では「危険」まで引き上げず「注意」に留めているのはこのためです。
- **見逃し(False Negative)**: 既知のブランド一覧([src/brands.ts](src/brands.ts))と
  無料ホスティング一覧([src/freeHosting.ts](src/freeHosting.ts))に載っていない
  ブランド・サービスは検出できません。また、実在の悪性URLデータベースとの照合は
  行っていないため、リスト化されていない手口(全く無関係なドメイン名を使った
  フィッシング等)は検出できません。
- **国際化ドメイン名(IDN)**: Punycode / ホモグラフ攻撃(似た文字での偽装)には
  未対応です。
- **ドメイン構造の簡略化**: パブリックサフィックスリスト(PSL)を厳密に
  参照していないため、複雑なマルチパートTLD(`co.jp`等以外の特殊なケース)では
  判定精度が落ちる可能性があります。

## 今後の拡張予定

- Google Safe Browsing API との連携(既知の悪性URLデータベース照合)
- タイポスクワッティング判定の精度向上(一般語の許可リスト化、ドメイン登録日等の追加シグナル)
- Punycode / IDN ホモグラフ攻撃の検出

## ライセンス

[MIT License](LICENSE)
