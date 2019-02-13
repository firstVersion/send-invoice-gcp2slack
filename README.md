# How to use

## 実行環境
gcloudコマンド
shが動く

## 必要な情報
- slack api token
- slack channel name
- GCP billingデータのテーブル名( project_name.db_name.table_name)
- プロジェクト名

##実行手順
- 上記の３つをdeploy.sh.orgに記入！
- deploy.shにリネーム！
- 実行！（gcloud コマンドのセットアップはやっておいてください。）```sh deploy.sh```
- これだけでは定期実行が行われないので、生成されたFunctionsのエンドポイントにリクエストを送るスクリプトを組むか、Google Schedulerなどで定期リクエストを送るように設定してください。
