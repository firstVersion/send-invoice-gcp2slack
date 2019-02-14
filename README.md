# README

## 実行環境
- gcloudコマンド
- shが動く

## 必要な情報

| 変数名 | 説明 | 例 |
|---|---|---|
| PROJECT_NAME | GCPのプロジェクト名。デプロイ時に必要 | fisrt-project |
| FUNCTION_NAME | 関数名、任意の名前をご指定ください | notifySlack |
| SLACK_API_TOKEN | SlackのAPIトークン | xoxp-000000000000-000000000000-012301230123-0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0 |
| SLACK_CHANNEL_NAME | Slackのチャンネル名 | general |
| TABLE_NAME | テーブル名 | first_project.dbname.tablename |
| FULL_BURST | ログの出力量 | 1 or 0 |
| INVOICE_MONTH | 今月支払う分をプロジェクト毎に表示 | 1 or 0  |
| INVOICE_DAY | 今月支払う分のプロジェクトの内訳を表示 | 1 or 0  |
| DIFF_PERDAY | 前日の丸一日にかかった費用を表示する | 1 or 0  |
| DIFF_INCREASE_AMOUNT_YESTERDAY | 前日と前々日の増加分の差分を表示 | 1 or 0  |

## 実行手順

- 以下のように各項目に自身の情報を入力します。※この時上記の表以外にプロジェクト名も記入することを忘れずに（今回の場合はprojectnameがプロジェクト名に該当します。）

```
PROJECT_NAME="hogehoge"
FUNCTION_NAME="notifySlack"
SLACK_API_TOKEN="xoxp-"
SLACK_CHANNEL_NAME="general"
TABLE_NAME=""
INVOICE_MONTH="1"
INVOICE_DAY="1"
DIFF_PERDAY="1"
DIFF_INCREASE_AMOUNT_YESTERDAY="0"

cd `dirname $0`
sed -ri "s/exports\..+ = \(/exports\.${FUNCTION_NAME} = \(/g" index.js;
gcloud beta functions deploy $FUNCTION_NAME \
--set-env-vars=\
"SLACK_API_TOKEN"="${SLACK_API_TOKEN}",\
"SLACK_CHANNEL_NAME"="${SLACK_CHANNEL_NAME}",\
"TABLE_NAME"="${TABLE_NAME}",\
"INVOICE_MONTH"="${INVOICE_MONTH}",\
"INVOICE_DAY"="${INVOICE_DAY}",\
"DIFF_PERDAY"="${DIFF_PERDAY}",\
"DIFF_INCREASE_AMOUNT_YESTERDAY"="${DIFF_INCREASE_AMOUNT_YESTERDAY}" \
--project=$PROJECT_NAME \
--trigger-http
```

- deploy.shにリネーム！
```
$ mv deploy.sh.org deploy.sh
```
- 実行
```
$ sh deploy.sh
```

- これだけでは定期実行が行われないので、生成されたFunctionsのエンドポイントにリクエストを送るスクリプトを組むか、Google Schedulerなどで定期リクエストを送るように設定してください。

Cloud Schedulerを使うなら、以下の記事で説明しております！！
https://qiita.com/firstVersion/items/f619a6eac3b75f27aea4
