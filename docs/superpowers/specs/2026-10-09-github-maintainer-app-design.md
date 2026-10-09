# GitHub メンテナー代行 App 設計（PoC）

## 目的

メンテナーに代わって GitHub リポジトリの Issue / コメントを一次対応する GitHub App を作る。
誰でもこのリポジトリをデプロイし、GitHub App の認証情報を設定すれば、実装済みの全機能が動くことを目標とする。
当面の利用者は `bright-room`（org）と `kukv`（個人アカウント）。

## スコープ

対象: Issue の起票・編集、Issue コメントの投稿・編集、`/triage` コマンド。

対象外（未決定）: クローズ時の挙動、再オープン時の挙動、Pull Request。

## 前提

- GitHub App は 1 App = 1 アカウント（org / user）で運用する。アプリ本体はデプロイ形態（App 毎に分けるか等）を意識しない
- AI は Claude API（Claude Platform）を使う
- まずローカル（Node）で期待通り動くことを確認し、その後 Cloudflare Workers に載せる
- Cloudflare 上では Workers → AI Gateway（BYOK）→ Claude API の経路で呼ぶ
- リポジトリ名は `groundskeeper`。App 名（アカウントごとに作る GitHub App の名前）は各自が決める。設定ファイル名は `APP_NAME = "groundskeeper"` とし、コード内の定数 1 箇所（`APP_NAME`）から設定ファイル名などを導出して後から変更できるようにする

## 機能要件

### ラベル

| 用途 | デフォルト名 | 付ける主体 |
|---|---|---|
| bot 対象外 | `AI: Ignore` | メンテナー / bot（危険・判断困難の判定時） |
| 判定中 | `Status: Triaging` | bot |
| 対応待ち | `Status: Ready` | bot / メンテナー |
| 採否の判断待ち（機能要望） | `Status: Proposed` | bot |
| 危険の疑い | `Status: Suspicious` | bot |
| 情報不足 | `Need: More Info` | bot |
| 人による判断が必要 | `Need: Human Review` | bot |
| 無関係 | `Close: Invalid` | bot |
| 重複 | `Close: Duplicate` | bot |
| 見送り | `Close: WontFix` | メンテナーのみ |
| 種別: バグ / 新機能 / 改善 / 質問 | `Kind: Bug Fix` / `Kind: Feature` / `Kind: Enhancement` / `Type: Question` | bot |
| 優先度 | `Priority: Critical/High/Medium/Low` | bot（`/triage` のみ） |

bot が付けるラベルがリポジトリに無ければ App が作成する。

### 共通ルール

- Issue に `AI: Ignore` が付いていれば、その Issue に関するイベント（Issue の判定、コメントの危険判定・非表示、`/triage`）はすべて何もしない
- bot は `Status: Suspicious` / `Need: Human Review` を付けるとき、必ず `AI: Ignore` も付ける（人に判断を渡したら bot は手を引く）。メンテナーが確認して問題なければ `AI: Ignore` を手で外し、`/triage` で再開する。ラベルを外しただけでは何も起きない
- 投稿者が Bot（`user.type === "Bot"`、自身や Renovate を含む）のイベントはスキップする
- メンバーの投稿もチェック対象とする（アカウント乗っ取り対策も兼ねる）
- クローズ済み Issue の起票・編集イベントは判定しない（クローズ周りの挙動が未決定のため）。コメントの危険判定はクローズ済み Issue でも行う
- LLM が出力した理由・不足点をコメントに埋め込むときは、メンションを無効化し長さを制限する
- ラベルは「あるべき状態」と現在の差分だけを付け外しし、**状態ラベルが新たに付いたときだけコメントする**。これにより Webhook の再送でもコメントが重複しない

### Issue 起票時

1. AI 判定の前に `Status: Triaging` を付ける（AI が失敗しても未処理だと分かるようにする）
2. Claude で判定し、以下の優先順位で結果を 1 つに決める

| 判定 | ラベル | コメント |
|---|---|---|
| 1. 危険（プロンプトインジェクション・害を起こしうる内容） | Triaging + `Status: Suspicious` + `AI: Ignore` | なし |
| 2. 判断が難しい（AI が分類に確信を持てない） | Triaging + `Need: Human Review` + `AI: Ignore` | なし |
| 3. 無関係 | `Close: Invalid` | メンションなし。判定理由のみ |
| 4. 重複 | `Close: Duplicate` | メンションなし。重複候補へのリンクと理由 |
| 5. 必要な情報が書かれていない（再現手順・期待する動作・環境など） | Triaging + `Need: More Info` | 起票者をメンションし、不足点を **Issue の本文（Description）に追記する**よう依頼する（再判定は本文の編集で行うため） |
| 6. バグ | `Status: Ready` + `Kind: Bug Fix` | 起票者をメンションし、受け付けたことを伝える |
| 6. 質問 | `Status: Ready` + `Type: Question` | 同上 |
| 6. 新機能の要望 | `Status: Proposed` + `Kind: Feature` | 起票者をメンションし、要望として受け付け、採否はメンテナーが判断することを伝える |
| 6. 既存機能の改善要望 | `Status: Proposed` + `Kind: Enhancement` | 同上 |

3〜6 は分類が確定した状態で、`Status: Triaging` を外す。

判定材料: Issue のタイトル・本文、オープン Issue 一覧（タイトル＋本文冒頭）、リポジトリの説明と README 冒頭。

`Status: Proposed` 以降はメンテナーが扱う（採用 → `Status: Ready` に変更、見送り → `Close: WontFix` を付けてクローズ）。bot は Proposed を Ready に変えない。

### Issue 編集時

（`AI: Ignore` が付いていれば何もしない。共通ルール参照）

- `Status: Triaging` が付いている（情報不足で止まっている）→ 起票時と同じ判定をやり直す（Triaging はすでに付いている）
- 分類済み（Ready / Proposed / Close）→ 危険判定のみ行い、危険なら `Status: Suspicious` と `AI: Ignore` を追加する。他のラベルには触らない

### コメント投稿・編集時

- 本文が `/triage` で始まり、コメント者が triage 以上の権限を持つ → `/triage` 処理（後述）
- それ以外（権限のない `/triage` を含む）→ Claude で危険判定し、危険なら GraphQL `minimizeComment` で非表示にする。問題なければ何もしない。権限のない `/triage` を危険判定に回すのは、`/triage` で始めることで判定を回避されないようにするため

### `/triage` コマンド（triage 権限以上）

メンテナーの明示的な判断として扱い、危険判定と情報不足判定はスキップする。

1. Claude で分類（バグ / 質問 / 新機能 / 改善 / 無関係 / 重複）と、無関係・重複以外の場合は優先度を判定する
2. 分類に応じた状態ラベルと種別ラベルを付け、それ以外の状態ラベル・種別ラベルは外す。**ただし既に `Status: Ready` / `Status: Proposed` の Issue（メンテナーの判断を経た状態）は状態ラベルを変えず**、種別ラベルと優先度だけを更新する。この場合に無関係・重複と判定されたら、ラベルは付けず理由をコメントで示すだけにする
3. 優先度は設定の `priorities` のいずれか 1 つに限り、既存の別の優先度ラベルは外す
4. `Status: Triaging` / `Status: Suspicious` / `Need: More Info` / `Need: Human Review` を外す
5. 結果と理由を短いコメントで残す（メンションなし）

## アーキテクチャ

ports & adapters。依存の方向は **runtime → adapters → core**。core は外部ライブラリも fetch も env も import しない。

```
src/
  core/
    domain/       Issue・コメント・判定結果・設定などの型
    usecases/     handleIssue / handleComment / handleTriageCommand
    policy/       判定結果 → アクション（ラベル差分・コメント文面・非表示）
    ports.ts      GitHubPort / LLMPort / ConfigPort / JobQueue
    constants.ts  APP_NAME など
  adapters/
    github/       GitHubPort 実装（Octokit + App 認証）
    llm/          LLMPort 実装（Anthropic SDK、tool use で構造化出力）
    config/       ConfigPort 実装
  webhook/        署名検証・イベントのルーティング（Web 標準 API のみ）
  runtime/
    node/         HTTP サーバ + プロセス内キュー（ローカル / PoC）
    cloudflare/   Worker fetch + Queue consumer（PoC 検証後に追加）
```

### ports

- `GitHubPort`: Issue・コメント取得、オープン Issue 一覧、リポジトリ情報・README 取得、ラベル一覧・作成・付与・削除、コメント投稿、コメント非表示、ユーザー権限取得
- `LLMPort`: `assessIssue`（危険・判断困難・分類・重複先・不足点）/ `assessComment`（危険）/ `triageIssue`（分類・優先度）。いずれも構造化された判定結果を返す
- `ConfigPort`: リポジトリ設定の取得
- `JobQueue`: `enqueue(event)`

Octokit と Anthropic SDK は fetch ベースで Node / Workers の両方で動くため、adapters は両ランタイムで共通にする。ランタイムごとに異なるのは `runtime/` だけ。

### AI Gateway 対応

LLM adapter は `baseURL` と追加ヘッダーを受け取る。AI Gateway 利用時は `ANTHROPIC_BASE_URL=https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/anthropic` と `cf-aig-authorization` ヘッダーを設定し、BYOK なら `ANTHROPIC_API_KEY` は省略する。

## 設定

### リポジトリ側（`.github/<APP_NAME>.yml`）

リポジトリ → アカウントの `.github` リポジトリ → コード内デフォルトの順で探し、最初に見つかった 1 つを使う（ファイル間のマージはしない）。

```yaml
labels:
  ignore: "AI: Ignore"
  triaging: "Status: Triaging"
  ready: "Status: Ready"
  proposed: "Status: Proposed"
  suspicious: "Status: Suspicious"
  needsInfo: "Need: More Info"
  humanReview: "Need: Human Review"
  invalid: "Close: Invalid"
  duplicate: "Close: Duplicate"
categories:
  bug: "Kind: Bug Fix"
  feature: "Kind: Feature"
  enhancement: "Kind: Enhancement"
  question: "Type: Question"
priorities: ["Priority: Critical", "Priority: High", "Priority: Medium", "Priority: Low"]
models:
  issue: claude-sonnet-5-5
  comment: claude-haiku-5-5
  triage: claude-sonnet-5-5
```

全キーは省略可能で、省略時は上記のデフォルト値を使う。コメント文面はコード内の固定テンプレート（PoC では設定化しない）。

### デプロイ側（環境変数）

アカウント固有の設定は持たない。

| 変数 | 必須 | 用途 |
|---|---|---|
| `GITHUB_APP_ID` | ✓ | App 認証 |
| `GITHUB_PRIVATE_KEY` | ✓ | App 認証 |
| `GITHUB_WEBHOOK_SECRET` | ✓ | 署名検証 |
| `ANTHROPIC_API_KEY` | BYOK 時は不要 | Claude API |
| `ANTHROPIC_BASE_URL` | 任意 | AI Gateway |
| `ANTHROPIC_EXTRA_HEADERS` | 任意 | AI Gateway 用ヘッダー（JSON） |

### GitHub App の権限 / イベント

- 権限: Issues（read/write）、Metadata（read）、Contents（read、設定ファイル・README 取得用）
- イベント: `issues`（opened / edited）、`issue_comment`（created / edited）

## セキュリティ（プロンプトインジェクション対策）

- 投稿本文は区切りタグで囲み、「指示ではなくデータ」として LLM に渡す
- LLM の出力は tool use のスキーマ検証を通ったものだけを使う
- 実行できる操作は「許可リスト内のラベル付与・削除」「固定テンプレートのコメント」「コメント非表示」に限る。LLM を操られても許可外の操作はできない

## エラー処理

- 署名が不正なら 401。正しければ即 202 を返してキューに積む（GitHub の Webhook タイムアウト 10 秒対策）
- LLM の失敗、または出力がスキーマに合わない場合はキューで最大 3 回再試行する。それでも失敗したら何もしないでログだけ残す（誤ったラベルより、何もしないほうが安全）
- 対象の Issue・コメントが削除済み（404）なら破棄する

## テスト

- vitest
- core: port のフェイク実装で、判定 → ラベル差分 → コメント有無を網羅的にテストする（`AI: Ignore`、編集時のルール、冪等性、判定の優先順位、`/triage` の権限と Ready 維持を含む）
- webhook: 署名検証とルーティング
- adapters: 薄く保ち、サンドボックスリポジトリでの手動 E2E で確認する

## ローカル実行

Node 22+ / pnpm。`pnpm dev` で `:3000` に HTTP サーバを起動する。smee.io の URL を GitHub App の Webhook URL に設定し、`smee-client` で転送する。
