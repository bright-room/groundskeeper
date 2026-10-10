# 開発

ローカルで groundskeeper を動かし、GitHub からの Webhook を受けて動作確認するまでの手順。

## 構成

pnpm workspace の monorepo。

| パッケージ | 役割 |
|---|---|
| `packages/core` | ランタイム非依存のドメイン・ports・usecase・Webhook 処理（Web 標準 API のみ） |
| `packages/adapters` | GitHub（Octokit）・設定ファイル・Claude API |
| `packages/tsconfig` | 共通 tsconfig |
| `apps/node` | ローカル実行用の HTTP サーバとメモリキュー |

設計: [superpowers/specs/2026-10-09-github-maintainer-app-design.md](superpowers/specs/2026-10-09-github-maintainer-app-design.md)

## コマンド

| コマンド | 内容 |
|---|---|
| `pnpm dev` | ローカルサーバを起動する（`http://localhost:3000/webhook`） |
| `pnpm tunnel` | Cloudflare Tunnel で一時的な公開 URL を発行する |
| `pnpm smoke:llm` | Claude API の疎通を確認する（引数でモデルを指定できる） |
| `pnpm lint` / `pnpm lint:fix` | Biome で lint・フォーマット・import 順を検査する / 修正する |
| `pnpm typecheck` | 全パッケージを型検査する |
| `pnpm test` | 全パッケージのテストを実行する |

## 初回セットアップ

### 1. ツールと依存を入れる

```bash
mise install    # node / pnpm / cloudflared（バージョンは mise.toml）
pnpm install
```

### 2. tunnel を起動して URL を控える

GitHub から手元の PC に Webhook を届けるため、Cloudflare の quick tunnel で一時的な公開 URL を発行する（Cloudflare アカウントは不要）。

```bash
pnpm tunnel     # ターミナル 1。起動したままにする
```

ログに出る `https://<ランダム>.trycloudflare.com` を控える。Webhook URL はこれに `/webhook` を付けたもの。
UDP や IPv6 が通らないネットワークでもつながるよう、QUIC ではなく HTTP/2（TCP 443）・IPv4 で接続している。

### 3. GitHub App を作成する

[github-app.md](github-app.md) の手順で作成する。Webhook URL には手順 2 の URL を使い、Webhook secret は `openssl rand -hex 32` で作る。
インストールは手順 5 でサーバを起動してから行う。

### 4. `.env` を作る

リポジトリ直下に作る（`.gitignore` 済み）。

```bash
cp .env.example .env
```

| 変数 | 値 | 必須 |
|---|---|---|
| `PORT` | 待ち受けポート | 任意（既定 3000。変える場合は `apps/node/package.json` の `tunnel` も合わせる） |
| `GITHUB_APP_ID` | App ID | 必須 |
| `GITHUB_PRIVATE_KEY` | Private key（改行を `\n` にした 1 行） | 必須 |
| `GITHUB_WEBHOOK_SECRET` | App に設定した Webhook secret | 必須 |
| `ANTHROPIC_API_KEY` | Anthropic API キー | `pnpm smoke:llm` を使うとき |
| `ANTHROPIC_BASE_URL` | Cloudflare AI Gateway の URL | AI Gateway を経由するとき |
| `ANTHROPIC_EXTRA_HEADERS` | 追加ヘッダー（JSON）。例: `{"cf-aig-authorization":"Bearer <token>"}` | AI Gateway を経由するとき |

`GITHUB_PRIVATE_KEY` は次のコマンドで設定する。`.env.example` 由来の空の行を消してから追記し、鍵の中身は画面に出ない。

```bash
grep -v '^GITHUB_PRIVATE_KEY=' .env > .env.tmp && mv .env.tmp .env
printf 'GITHUB_PRIVATE_KEY="%s"\n' "$(awk 'NR>1{printf "\\n"}{printf "%s",$0}' <path/to/private-key.pem>)" >> .env
grep -c '^GITHUB_PRIVATE_KEY="-----BEGIN' .env   # 1 と出れば OK
```

### 5. サーバを起動する

```bash
pnpm dev        # ターミナル 2
```

`listening on http://localhost:3000/webhook` と出れば OK。
`環境変数 XXX が設定されていません` と出たら `.env` を見直す。

### 6. App をインストールする

[github-app.md の「インストールする」](github-app.md#4-インストールする) の手順で、試験用のリポジトリにインストールする。

### 7. 動作確認

| 操作 | `pnpm dev` に出るログ |
|---|---|
| インストールしたリポジトリで Issue を作る | `[issue:opened] <owner>/<repo>#N "<タイトル>" labels=[]` |
| その Issue にコメントする | `[comment:created] <owner>/<repo>#N by <login> (<文字数> chars)` |
| `pnpm smoke:llm` を実行する | `{ language: ..., sentiment: ... }` |

bot（groundskeeper 自身や Renovate など）が起こしたイベントは処理しないので、ログにも出ない。

Issue 作成と同時に担当者やラベルを付けると、`[issue:assigned]` などが `opened` より先に出ることがある。同時に届いたイベントを並行して処理しているためで、問題ない。

## 2 回目以降の起動

quick tunnel の URL は起動のたびに変わる。

1. `pnpm tunnel` と `pnpm dev` を起動する
2. App 設定 → General → Webhook URL を新しい URL + `/webhook` に変えて Save changes

## うまくいかないとき

まず App 設定 → Advanced → Recent Deliveries でレスポンスを確認する。GitHub 側の設定が原因の場合は [github-app.md の「Webhook が届かないとき」](github-app.md#webhook-が届かないとき) も参照。

| 症状 | 原因 | 対処 |
|---|---|---|
| `pnpm dev` に `webhook rejected: 401 ...` が出る | `.env` の `GITHUB_WEBHOOK_SECRET` が App の Secret と一致していない | 揃えて `pnpm dev` を再起動し、Recent Deliveries から Redeliver |
| ログに何も出ず、Recent Deliveries が 502 / 530 | Webhook URL が古い tunnel のまま、または tunnel が止まっている | 「2 回目以降の起動」の手順で URL を更新する |
| 数秒後に `job failed after retries` が出る | App ID か Private key の誤り、またはリポジトリが未インストール | エラー内容を確認し、`.env` を直して再起動する |
| 秘密鍵の読み込みでエラーになる | `GITHUB_PRIVATE_KEY` が正しく読めていない | 手順 4 のコマンドで入れ直す |
| `pnpm tunnel` が `failed to dial to edge with quic: timeout` | 古いスクリプトで QUIC 接続している | `main` を取り込む。または `cloudflared tunnel --protocol http2 --edge-ip-version 4 --url http://localhost:3000` で起動する |

tunnel の疎通だけを確かめるときは、次のコマンドを使う（`<host>` は tunnel のホスト名）。

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<host>/healthz                  # 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<host>/webhook -d '{}'  # 401（署名がないので正しい）
```
