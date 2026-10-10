# GitHub App の作成

groundskeeper を使うには、自分のアカウント（org / user）で GitHub App を作成してインストールする。
この App の権限で Issue を読み、ラベルやコメントを操作する。

> 現時点で groundskeeper を動かせるのはローカル実行のみ。手順は [development.md](development.md) を参照。

## 事前に用意するもの

| もの | 内容 |
|---|---|
| App を作成できる権限 | org なら Owner、または org の GitHub App managers。user なら本人 |
| Webhook URL | groundskeeper を動かしている URL の末尾に `/webhook` を付けたもの。ローカル実行なら [development.md](development.md) の手順で発行する |
| Webhook secret | ランダムな文字列。`openssl rand -hex 32` などで作り、groundskeeper 側にも同じ値を設定する |

## 1. 作成画面を開く

- org: `https://github.com/organizations/<org>/settings/apps/new`
- user: https://github.com/settings/apps/new

## 2. 入力する項目

画面の上から順に記載する。記載のない項目は既定値のままでよい。

### 基本情報

| 項目 | 値 |
|---|---|
| GitHub App name | 任意（GitHub 全体で一意）。コメントの投稿者は `<App name>[bot]` と表示される |
| Description | 任意 |
| Homepage URL | 必須。任意の URL（このリポジトリの URL など） |

### Identifying and authorizing users / Post installation

ユーザーとしてログインさせる機能は使わないので、すべて空欄・チェックなしのままにする。

| 項目 | 値 |
|---|---|
| Callback URL | 空欄 |
| Request user authorization (OAuth) during installation | チェックなし |
| Enable Device Flow | チェックなし |
| Setup URL | 空欄 |
| Redirect on update | チェックなし |

### Webhook

| 項目 | 値 |
|---|---|
| Active | チェックあり |
| Webhook URL | `https://<host>/webhook` |
| Secret | 用意した Webhook secret |
| SSL verification | Enable |

### Permissions

Repository permissions に次の 3 つを付ける。それ以外の Repository permissions、Organization permissions、Account permissions は No access のままにする。

| 権限 | 値 | 用途 |
|---|---|---|
| Issues | Read and write | Issue・コメントの取得、ラベルの作成と付け外し、コメントの投稿と非表示 |
| Contents | Read-only | 設定ファイル `.github/groundskeeper.yml` と README の取得 |
| Metadata | Read-only（自動で付く） | リポジトリ情報とコラボレーター権限の取得 |

### Subscribe to events

Issues 権限を付けると選択肢に表示される（付けていないと表示されない）。

| イベント | チェック |
|---|---|
| Issues | あり |
| Issue comment | あり |

### Where can this GitHub App be installed?

**Only on this account** を選ぶ。

Any account にすると、ほかのアカウントもこの App をインストールできる。
そのアカウントの Webhook も自分の groundskeeper に届き、Claude API の利用料も自分にかかる。

最後に **Create GitHub App** を押す。

## 3. 作成後に控えるもの

App の設定画面（General）で取得し、groundskeeper 側に設定する。

| もの | 場所 |
|---|---|
| App ID | ページ上部の「App ID」（Client ID ではない） |
| Private key | ページ下部の Private keys → **Generate a private key**。`.pem` ファイルがダウンロードされる |

Private key は再ダウンロードできない。設定後はパスワードマネージャーなど安全な場所に保管し、ダウンロードしたファイルは削除する。

## 4. インストールする

1. App の設定画面の左メニュー **Install App** → 対象アカウントの **Install**
2. **Only select repositories** で対象リポジトリを選ぶ。最初は試験用のリポジトリ 1 つにすると安全
3. 表示される権限を確認して **Install**

## 後から権限・イベントを変えるとき

1. App 設定 → **Permissions & events** で変更し、**Save changes**
2. インストール先で承認する
   - org: Settings → GitHub Apps → 対象の App → **Review request**
   - user: Settings → Applications → Installed GitHub Apps → 対象の App
3. 承認するまでは古い権限のまま動き、新しく追加したイベントも届かない

## Webhook が届かないとき

App 設定 → **Advanced** → **Recent Deliveries** で、配信ごとのリクエストとレスポンスを確認できる。**Redeliver** で再送もできる。

| 症状 | 原因 | 対処 |
|---|---|---|
| Subscribe to events に Issues / Issue comment がない | Issues 権限が No access | Issues を Read and write にする |
| Recent Deliveries に `issues` / `issue_comment` の配信がない | イベント未購読、またはリポジトリが未インストール、または権限変更が未承認 | Subscribe to events とインストール先を確認する。権限を変えた場合は承認する |
| レスポンスが 401 | Webhook secret が groundskeeper 側と一致していない | 両方を同じ値にして Redeliver |
| レスポンスが 502 / 530、または接続失敗 | Webhook URL の先で groundskeeper が動いていない | URL と groundskeeper の起動状態を確認する |
