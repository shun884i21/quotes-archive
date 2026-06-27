#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""毎朝、pool.json から1本を quotes.json へ移して「今日の格言」にする。
GitHub Actions から実行される。外部依存なし（標準ライブラリのみ）。
DRY_RUN=1 を付けるとファイルを書き換えず内容だけ表示する。
"""
import json
import os
import sys
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUOTES = os.path.join(ROOT, "quotes.json")
POOL = os.path.join(ROOT, "pool.json")
DRY = os.environ.get("DRY_RUN") == "1"


def load(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    jst = datetime.timezone(datetime.timedelta(hours=9))
    now = datetime.datetime.now(jst)  # JST
    today = now.strftime("%Y-%m-%d")
    updated = now.strftime("%Y-%m-%dT%H:%M:%S+09:00")

    q = load(QUOTES, {"quotes": []})
    quotes = q.get("quotes", [])

    # 同日に二重追加しない（ワークフロー再実行への保険）
    if any(x.get("featuredDate") == today for x in quotes):
        print("既に本日分は追加済み:", today)
        return

    pool = load(POOL, {"quotes": []})
    pq = pool.get("quotes", [])
    if not pq:
        print("プールが空です。新規追加なし（アプリはアーカイブから日替わり表示を継続）。")
        return

    # 直近7本の人物と連続しないものを選ぶ
    recent_authors = [x.get("author") for x in quotes[:7]]
    pick = 0
    for i, item in enumerate(pq):
        if item.get("author") not in recent_authors:
            pick = i
            break
    item = pq.pop(pick)

    item["addedAt"] = today
    item["featuredDate"] = today
    quotes.insert(0, item)
    q["quotes"] = quotes
    q["updatedAt"] = updated
    q.pop("seed", None)
    pool["quotes"] = pq

    print(u"追加: {} - {} ... | 残りプール: {}".format(
        item.get("author"), (item.get("text") or "")[:30], len(pq)))

    if DRY:
        print("[DRY_RUN] ファイルは書き換えていません。")
        return

    save(QUOTES, q)
    save(POOL, pool)


if __name__ == "__main__":
    main()
