# -*- coding: utf-8 -*-
"""正本JSONを index.html の <script> データブロックに埋め込む。

- criteria-data.json      → <script id="criteriaData">     （豚舎別評価の基準）
- work-criteria.json      → <script id="workCriteriaData"> （作業評価の共通観点＋カテゴリ）
  ＋ works-data.json を works フィールドに結合してから埋め込む（作業＝大項目・固有観点）

基準を更新したら本スクリプトを実行して index.html へ再埋め込みする
（build_pdf.py / build_xlsx.py と同じ正本を共有）。

    python build_html.py
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
DST = os.path.join(BASE, "index.html")


def dumps(obj):
    # </script> でタグが閉じないよう "</" をエスケープ（JSON.parse は "\/" を "/" と解釈）
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def embed(html, marker_id, payload):
    pat = re.compile(
        r'(<script id="%s" type="application/json">).*?(</script>)' % re.escape(marker_id), re.S
    )
    if not pat.search(html):
        raise SystemExit(f"ERROR: {marker_id} マーカーが index.html に見つかりません")
    return pat.sub(lambda m: m.group(1) + payload + m.group(2), html, count=1)


# --- 豚舎別評価の基準 ---
with open(os.path.join(BASE, "criteria-data.json"), encoding="utf-8") as f:
    criteria = json.load(f)

# --- 作業評価（共通観点＋カテゴリ）＋作業データ結合 ---
with open(os.path.join(BASE, "work-criteria.json"), encoding="utf-8") as f:
    work = json.load(f)
with open(os.path.join(BASE, "works-data.json"), encoding="utf-8") as f:
    works = json.load(f)
work["works"] = works

with open(DST, encoding="utf-8") as f:
    html = f.read()

html = embed(html, "criteriaData", dumps(criteria))
html = embed(html, "workCriteriaData", dumps(work))

with open(DST, "w", encoding="utf-8", newline="\n") as f:
    f.write(html)

n_criteria = sum(len(b["items"]) for b in criteria)
n_aspects = sum(len(w["aspects"]) for w in works)
print(f"OK: 豚舎別{n_criteria}項目 / 作業{len(works)}件・固有観点{n_aspects}個 を index.html に埋め込みました")
