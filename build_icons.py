# -*- coding: utf-8 -*-
"""PWA用アイコン（icon-192.png / icon-512.png）を生成する。

    python build_icons.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
PRI = (46, 125, 111)      # --pri #2e7d6f
PRI_D = (27, 94, 80)      # --pri-d #1b5e50
FONT = r"C:\Windows\Fonts\arialbd.ttf"


def make(size: int, out: str) -> None:
    img = Image.new("RGB", (size, size), PRI)
    d = ImageDraw.Draw(img)
    # 下部に濃色の帯（チェックリストの台紙イメージ）
    d.rectangle([0, int(size * 0.78), size, size], fill=PRI_D)
    # 「HSS」ロゴ
    fs = int(size * 0.30)
    font = ImageFont.truetype(FONT, fs)
    tw = d.textlength("HSS", font=font)
    d.text(((size - tw) / 2, size * 0.24), "HSS", font=font, fill=(255, 255, 255))
    # チェックマーク（評価アプリの象徴）
    w = max(2, size // 28)
    cx, cy, u = size * 0.5, size * 0.87, size * 0.035
    d.line([(cx - 2.2 * u, cy), (cx - 0.6 * u, cy + 1.4 * u), (cx + 2.4 * u, cy - 1.8 * u)],
           fill=(255, 255, 255), width=w, joint="curve")
    img.save(os.path.join(BASE, out))
    print("OK:", out)


make(192, "icon-192.png")
make(512, "icon-512.png")
