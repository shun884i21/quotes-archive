# 毎朝の格言タスク手順（quotes-archive）

Claude Code の定期タスクが毎朝8時(JST)に実行する手順。AIニュースシステムと同じ運用パターン。

## 実行内容

作業フォルダ: `C:\Users\shuns\OneDrive\デスクトップ\quotes-archive`

1. `git pull` で最新化する。
2. `quotes.json` を読み、`quotes[].author` と `quotes[].text` の一覧を把握する（重複回避のため）。直近7日に featuredDate を付けた人物も確認する。
3. WebSearch で「やる気・モチベーションが湧く偉人の格言」を探す。**既出の格言・直近の人物は避け、幅広いジャンル**から未出の1本を選ぶ。
4. その格言について以下を生成する:
   - `text`: 日本語訳
   - `original`: 原文（海外の偉人のみ。日本人は空文字）
   - `author`: 人物名
   - `authorBio`: 人物像（2〜3文）
   - `background`: その言葉が生まれた背景（2〜3文）
   - `source`: 出典URL（信頼できるソース。Wikiquote等）
   - `uncertain`: 出典が確証できない/誤帰属が疑われる場合は `true`、確かなら `false`
   - `tags`: テーマタグ（例: 挑戦, 努力, 人生）
   - `id`: 一意のスラッグ（例: `author-keyword`）
   - `addedAt`: 実行日（YYYY-MM-DD）
   - `featuredDate`: 実行日（YYYY-MM-DD）← これにより当日「今日の格言」に出る
5. 新しい格言を `quotes.quotes` の**先頭**に追加し、`quotes.updatedAt` を現在時刻(JST)に更新する。初回実行時は `seed: true` を削除する。
6. `git add -A && git commit -m "格言追加: <author>" && git push` する。

## 注意
- 誤帰属（偽名言）に注意。確証が持てないものは必ず `uncertain: true` と「諸説あり」になるようにする。
- 1日1本のみ追加する。
