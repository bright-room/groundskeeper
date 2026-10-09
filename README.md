# groundskeeper

GitHub App that takes care of repositories on behalf of maintainers — issue triage, comment moderation and more.

> 現在は足回り（Webhook 受信・GitHub App 認証・設定読み込み・LLM 呼び出し）のみ。
> ジョブは取得した Issue / コメントをログに出すだけで、ラベル付与などの判定ロジックは未実装。

設計: `docs/superpowers/specs/2026-10-09-github-maintainer-app-design.md`

## 構成

pnpm workspace の monorepo。

| パッケージ | 役割 |
|---|---|
| `packages/core` | ランタイム非依存のドメイン・ports・usecase・Webhook 処理（Web 標準 API のみ） |
| `packages/adapters` | GitHub（Octokit）・設定ファイル・Claude API |
| `packages/tsconfig` | 共通 tsconfig |
| `apps/node` | ローカル実行用の HTTP サーバとメモリキュー |

ツールのバージョンは `mise.toml` で管理する（`mise install`）。

## GitHub App の作成

1 アカウント（org / user）につき 1 つ作成する。

- Repository permissions: Issues = Read and write, Contents = Read-only, Metadata = Read-only
- Subscribe to events: Issues, Issue comment
- Webhook URL: ローカルでは `pnpm tunnel` が表示する URL の末尾に `/webhook` を付けたもの
- Webhook secret: 任意の文字列（`.env` の `GITHUB_WEBHOOK_SECRET` と一致させる）
- 作成後に Private key を生成し、対象リポジトリにインストールする

## ローカル実行

```bash
pnpm install
cp .env.example .env                      # リポジトリ直下に置く。値を埋める。秘密鍵は改行を \n にして 1 行で書く
pnpm dev                                  # http://localhost:3000/webhook
pnpm tunnel                               # 別ターミナル。Cloudflare Tunnel で一時 URL を発行する
```

`pnpm tunnel` は `https://<ランダム>.trycloudflare.com` を表示する（Cloudflare アカウント不要）。
URL は起動のたびに変わるので、そのたびに App の Webhook URL を `https://<ランダム>.trycloudflare.com/webhook` に更新する。
`cloudflared` は `mise install` で入る。

秘密鍵の読み込みでエラーになる場合は PKCS#8 に変換する:
`openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in app.pem -out app-pkcs8.pem`

### 動作確認

1. インストールしたリポジトリでテスト Issue を作る → `pnpm dev` のターミナルに
   `[issue:opened] owner/repo#N "タイトル" labels=[...]` が出る
2. その Issue にコメントする → `[comment:created] ... by <login>` が出る
3. `pnpm smoke:llm` → `{ language: ..., sentiment: ... }` が返る（引数でモデルを指定可）

Cloudflare AI Gateway を経由する場合は `.env` に `ANTHROPIC_BASE_URL` と
`ANTHROPIC_EXTRA_HEADERS`（例: `{"cf-aig-authorization":"Bearer <token>"}`）を設定する。

## 設定ファイル（任意）

`.github/groundskeeper.yml` をリポジトリ、またはアカウントの `.github` リポジトリに置く。
リポジトリ → `.github` リポジトリ → デフォルトの順で、最初に見つかったものを使う。
キーの内容は判定ロジックの設計確定後に決める。
