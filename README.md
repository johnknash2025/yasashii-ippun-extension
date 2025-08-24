# やさしい1分（ブラウザ拡張 / MV3）

60秒で落ち着く小さな休憩と、穏やかな返信アシストを提供するChrome拡張です。

- やさしいスクロールブレーク（一定スクロールで60秒ガイド提示）
- やわらか返信アシスト（右クリック→穏やかな文面に言い換え）
- ワンタップ・チェックイン（ポップアップから60秒開始と記録）

## 開発環境

- マニフェスト: Manifest V3
- 依存ツール: なし（素のHTML/CSS/JS）

## ローカルでの読み込み

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」→ このフォルダ `yasashii-ippun-extension` を選択

## ファイル構成

- `manifest.json` 拡張の設定
- `background.js` コンテキストメニューなどのバックグラウンド処理
- `content.js` ページ上の検知/オーバーレイ表示・言い換えモーダル
- `popup.html|css|js` ツールバーのポップアップUI
- `options.html|css|js` オプション（対象サイト/頻度/音・APIベースURL・ログインURL）

## サーバ連携の設定

1. オプションページで以下を設定
   - APIベースURL: 例 `https://<yourapp>.vercel.app`
   - ログインURL: 例 `https://<yourapp>.vercel.app/auth/extension`
2. マニフェストで `identity` 権限を使用しています。`chrome.identity.launchWebAuthFlow` によりログインします。
3. ログインフローは `redirect_uri` として拡張のリダイレクトURL（`chrome.identity.getRedirectURL()`）を渡し、
   リダイレクト先のURLハッシュに `#access_token=...` を含めて返す想定です。
4. ポップアップの「やさしい一言をもらう」から `POST /api/v1/generate` を呼び出します。

## デプロイ手順（概要）
- サーバ(API): `yasashii-ippun-api` を別リポジトリとしてVercelへデプロイ（README参照）
- Supabase: スキーマ適用・OAuth許可URL設定（`https://<拡張ID>.chromiumapp.org/*`）
- Stripe: Product/Price作成、Webhook設定
- 拡張: オプションで APIベースURL/ログインURL を本番値に設定
- 公開: Chrome Web Store でパッケージ提出（アイコンや説明文を用意）

## よくある不具合
- 401: ログイン未完了 or トークン不正 → ログインやり直し
- CORS: サーバの `ALLOWED_ORIGINS` に `chrome-extension://<拡張ID>` を追加
- ログインが戻らない: `redirect_uri`/許可リダイレクトURLの不一致を確認

## 既知の注意

- アイコン画像は未同梱（ストア提出時にPNG各サイズが必要）
- LLM連携は未実装（OptionsのAPIキー欄は後続で追加予定）

## ライセンス

GNU Affero General Public License v3.0 (AGPL-3.0-only)

詳細は同梱の `LICENSE` を参照してください。
