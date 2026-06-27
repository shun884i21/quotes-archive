# 毎朝の自動追加について（quotes-archive）

PCの起動状態に関係なく、**GitHub Actions（クラウド）が毎朝8時(JST)に自動で1本追加**する方式。

## 仕組み
- `pool.json` … 公開待ちの格言の在庫（人物像・背景・出典つき）。
- `.github/workflows/daily-quote.yml` … 毎朝 08:00 JST（cron `0 23 * * *` UTC）と手動実行で起動。
- `scripts/publish_daily.py` … 在庫から1本を `quotes.json` の先頭へ移し、`featuredDate` を当日にする。直近7本の人物とは重ならないよう選ぶ。同日二重追加はしない。在庫が空ならスキップ（アプリは既存アーカイブから日替わり表示を継続）。
- 変更があれば `github-actions[bot]` がコミット＆pushし、GitHub Pagesに反映。

## 在庫（プール）の補充
在庫が少なくなったら、`pool.json` の `quotes` 配列に同じスキーマで追記すればよい。
スキーマ: `{id, text, original, author, authorBio, background, source, uncertain, tags}`
（`addedAt` と `featuredDate` は公開時に自動付与される）

## 手動でいますぐ1本追加したいとき
GitHubリポジトリの Actions タブ →「Daily Quote」→「Run workflow」。
ローカル確認は `DRY_RUN=1 python scripts/publish_daily.py`（書き換えなし）。
