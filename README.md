# groundskeeper

GitHub App that takes care of repositories on behalf of maintainers — issue triage, comment moderation and more.

> 開発中。現在は Webhook の受信、GitHub App 認証、設定ファイルの読み込み、Claude API の呼び出しまでを実装している。
> 受け取った Issue・コメントはログに出すだけで、ラベル付与などの判定はまだ行わない。また、ローカルでのみ動かせる。

## 使い方

1. 自分のアカウントで GitHub App を作成し、対象リポジトリにインストールする: [docs/github-app.md](docs/github-app.md)
2. groundskeeper を起動する（現在はローカル実行のみ）: [docs/development.md](docs/development.md)

### 設定ファイル（任意）

`.github/groundskeeper.yml` を対象リポジトリ、またはアカウントの `.github` リポジトリに置く。
対象リポジトリ → `.github` リポジトリ → 既定値の順で、最初に見つかったものを使う。
設定できる項目は判定ロジックの設計が決まってから定める。

## 開発

構成、コマンド、ローカルでの動かし方は [docs/development.md](docs/development.md) を参照。
