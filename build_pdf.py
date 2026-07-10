# -*- coding: utf-8 -*-
"""criteria-data.json から HSS実技試験 評価基準表のPDFを生成（日本語CIDフォント・横向きA3）"""
import json, os
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle, Paragraph,
                                Spacer, PageBreak)

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "criteria-data.json")
OUT = os.path.join(os.path.expanduser("~"), "Desktop", "HSS実技試験_評価基準表_20260630.pdf")

# 日本語フォント（reportlab同梱のAdobe-Japan1 CIDフォント。外部ファイル不要）
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))  # 見出し・太字相当
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))     # 本文

GOTHIC = "HeiseiKakuGo-W5"
MINCHO = "HeiseiMin-W3"

TERRA = colors.HexColor("#A8472A")
LEVEL_BG = [colors.HexColor("#FDE7E7"), colors.HexColor("#FBEFE0"),
            colors.HexColor("#FFF7E0"), colors.HexColor("#EDF4E6"),
            colors.HexColor("#E2EFE6")]
GRID = colors.HexColor("#9a9a9a")

with open(DATA, encoding="utf-8") as f:
    dataset = json.load(f)

# ---- スタイル ----
st_title = ParagraphStyle("title", fontName=GOTHIC, fontSize=22, leading=28,
                          textColor=TERRA, alignment=TA_CENTER)
st_sub = ParagraphStyle("sub", fontName=MINCHO, fontSize=11, leading=16,
                        textColor=colors.HexColor("#444444"), alignment=TA_CENTER)
st_h2 = ParagraphStyle("h2", fontName=GOTHIC, fontSize=15, leading=20, textColor=TERRA)
st_h3 = ParagraphStyle("h3", fontName=GOTHIC, fontSize=12, leading=16,
                       textColor=colors.HexColor("#222222"))
st_hdr = ParagraphStyle("hdr", fontName=GOTHIC, fontSize=9, leading=11,
                        textColor=colors.white, alignment=TA_CENTER)
st_no = ParagraphStyle("no", fontName=GOTHIC, fontSize=9, leading=12, alignment=TA_CENTER)
st_name = ParagraphStyle("name", fontName=GOTHIC, fontSize=9, leading=12)
st_body = ParagraphStyle("body", fontName=MINCHO, fontSize=8, leading=11)
st_note = ParagraphStyle("note", fontName=MINCHO, fontSize=9.5, leading=15,
                         textColor=colors.HexColor("#333333"))
st_cellc = ParagraphStyle("cellc", fontName=MINCHO, fontSize=9, leading=12, alignment=TA_CENTER)

def P(text, style):
    return Paragraph(str(text).replace("\n", "<br/>"), style)

# ---- ページ寸法・列幅 ----
PAGE = landscape(A3)
MARGIN = 12 * mm
usable = PAGE[0] - 2 * MARGIN
col_no, col_name, col_kanten = 34, 84, 132
col_level = (usable - col_no - col_name - col_kanten) / 5.0
COLW = [col_no, col_name, col_kanten] + [col_level] * 5

HEADERS = ["No", "評価項目", "着眼点", "1 要指導", "2 要改善", "3 標準", "4 上回る", "5 模範的"]

# ---- スケール定義（表紙用） ----
SCALE_GYOMU = [
    ["1", "要指導", "～30%", "大半の業務に指示や指導が必要なレベル"],
    ["2", "要改善", "30%～", "半数の作業について指示や指導がなくとも行えるレベル"],
    ["3", "標準", "50%～", "指示は必要だが自身で一通り作業を行えるレベル"],
    ["4", "上回る", "70%～", "大半の業務内容を指示なく行えるレベル"],
    ["5", "模範的", "90%～", "業務の意義を理解して実行し、微調整まで行うことができるレベル"],
]
SCALE_SHISEI = [
    ["1", "要指導", "～30%", "大半の業務について都度確認や指示が必要なレベル"],
    ["2", "要改善", "30%～", "時折抜け漏れあるが、指摘や注意すれば行えるレベル"],
    ["3", "標準", "50%～", "言われたことについては一通り実行できるレベル"],
    ["4", "上回る", "70%～", "発言や姿勢から、意識して実行しているのがわかるレベル"],
    ["5", "模範的", "90%～", "チーム・部署に働きかけができるレベル"],
]

def scale_table(rows):
    head = [P("点数", st_hdr), P("区分", st_hdr), P("到達度の目安", st_hdr), P("説明", st_hdr)]
    body = [[P(r[0], st_cellc), P(r[1], st_cellc), P(r[2], st_cellc), P(r[3], st_body)] for r in rows]
    t = Table([head] + body, colWidths=[40, 70, 80, usable - 190])
    sty = [
        ("BACKGROUND", (0, 0), (-1, 0), TERRA),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, 6):
        sty.append(("BACKGROUND", (0, i), (-1, i), LEVEL_BG[i - 1]))
    t.setStyle(TableStyle(sty))
    return t

# ---- 本文（各シート） ----
def sheet_table(group):
    head = [P(h, st_hdr) for h in HEADERS]
    rows = [head]
    for it in group["items"]:
        rows.append([
            P(it["no"], st_no),
            P(it["name"], st_name),
            P(it.get("kanten", ""), st_body),
            P(it["level1"], st_body), P(it["level2"], st_body), P(it["level3"], st_body),
            P(it["level4"], st_body), P(it["level5"], st_body),
        ])
    t = Table(rows, colWidths=COLW, repeatRows=1)
    sty = [
        ("BACKGROUND", (0, 0), (-1, 0), TERRA),
        ("GRID", (0, 0), (-1, -1), 0.5, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    for c in range(3, 8):
        sty.append(("BACKGROUND", (c, 1), (c, -1), LEVEL_BG[c - 3]))
    t.setStyle(TableStyle(sty))
    return t

# ---- 組み立て ----
story = []
story.append(Spacer(1, 40))
story.append(P("HSS実技試験　評価基準表", st_title))
story.append(Spacer(1, 8))
story.append(P("分娩舎／ストール舎／肥育舎／子豚舎（離乳舎）／環境・防疫　＋　仕事への姿勢（全舎共通）", st_sub))
story.append(P("作成日：2026-06-30　全38項目・5段階評価", st_sub))
story.append(Spacer(1, 24))

story.append(P("■ 業務（作業遂行能力）スケール", st_h3))
story.append(Spacer(1, 4))
story.append(scale_table(SCALE_GYOMU))
story.append(Spacer(1, 16))
story.append(P("■ 姿勢スケール", st_h3))
story.append(Spacer(1, 4))
story.append(scale_table(SCALE_SHISEI))
story.append(Spacer(1, 16))
story.append(P("【使い方】", st_h3))
story.append(P("・各舎シートの項目を 1〜5 で採点します。判断に迷ったら「着眼点」と各レベルの説明文を参照してください。", st_note))
story.append(P("・業務シート（分娩舎〜環境・防疫）は「業務スケール」、「仕事への姿勢」は「姿勢スケール」を用います。", st_note))
story.append(P("・「仕事への姿勢（全舎共通）」は、すべての舎で共通して評価します。", st_note))

for group in dataset:
    story.append(PageBreak())
    story.append(P(group["sheet"], st_h2))
    story.append(P("評価スケール：" + ("業務" if group["scale"] == "業務" else "姿勢"), st_note))
    story.append(Spacer(1, 6))
    story.append(sheet_table(group))

doc = SimpleDocTemplate(OUT, pagesize=PAGE,
                        leftMargin=MARGIN, rightMargin=MARGIN,
                        topMargin=12 * mm, bottomMargin=12 * mm,
                        title="HSS実技試験 評価基準表", author="AI Company")
doc.build(story)
print("PDF生成:", OUT)
print("サイズ:", os.path.getsize(OUT), "bytes")
