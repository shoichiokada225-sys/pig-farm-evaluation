# -*- coding: utf-8 -*-
"""criteria-data.json を index.html の <script id="criteriaData"> に埋め込む。

正本は criteria-data.json。基準を更新したら本スクリプトを実行して
index.html へ再埋め込みする（build_pdf.py / build_xlsx.py と同じ正本を共有）。

    python build_html.py
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "criteria-data.json")
DST = os.path.join(BASE, "index.html")

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

# </script> でタグが閉じないよう "</" をエスケープ（JSON.parse は "\/" を "/" として解釈）
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

with open(DST, encoding="utf-8") as f:
    html = f.read()

pat = re.compile(r'(<script id="criteriaData" type="application/json">).*?(</script>)', re.S)
if not pat.search(html):
    raise SystemExit("ERROR: criteriaData マーカーが index.html に見つかりません")

html = pat.sub(lambda m: m.group(1) + payload + m.group(2), html, count=1)

with open(DST, "w", encoding="utf-8", newline="\n") as f:
    f.write(html)

n_items = sum(len(b["items"]) for b in data)
print(f"OK: {n_items}項目 / {len(payload):,} bytes を index.html に埋め込みました")
