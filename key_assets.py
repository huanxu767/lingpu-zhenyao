#!/usr/bin/env python3
"""Remove sprite backgrounds by flooding from the corners."""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SESSION = Path(
    "/Users/mac/.grok/sessions/%2FUsers%2Fmac/01a05716-4f2f-7233-9901-cd1df1cf5714/images"
)
ROOT = Path("/Users/mac/lingpu-zhenyao/public/assets")

MAP = {
    "1.jpg": ("plants", "dewlotus.png"),
    "2.jpg": ("plants", "coincurse.png"),
    "3.jpg": ("plants", "frostplum.png"),
    "4.jpg": ("plants", "peacharrow.png"),
    "5.jpg": ("plants", "firecracker.png"),
    "6.jpg": ("plants", "wardstone.png"),
    "8.jpg": ("plants", "lantern.png"),
    "11.jpg": ("plants", "sancang.png"),
    "14.jpg": ("plants", "twintao.png"),
    "9.jpg": ("enemies", "paperdoll.png"),
    "10.jpg": ("enemies", "bellcorpse.png"),
    "12.jpg": ("enemies", "wraith.png"),
    "13.jpg": ("enemies", "nighttanuki.png"),
    "19.jpg": ("enemies", "shanxiao.png"),
    "20.jpg": ("enemies", "vaultpaper.png"),
    "15.jpg": ("ui", "dew.png"),
    "16.jpg": ("ui", "nectar.png"),
    "18.jpg": ("ui", "ingot.png"),
    "21.jpg": ("ui", "sweeper.png"),
    "17.jpg": ("fx", "arrow.png"),
}


def key_and_trim(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    corners = np.array(
        [rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]],
        dtype=np.int16,
    )
    bg = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)

    mask = np.zeros((h, w), dtype=bool)
    q = deque()

    def seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not mask[y, x] and dist[y, x] < 70:
            mask[y, x] = True
            q.append((x, y))

    for x in range(0, w, 3):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(0, h, 3):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not mask[ny, nx] and dist[ny, nx] < 78:
                mask[ny, nx] = True
                q.append((nx, ny))

    alpha = arr[:, :, 3].astype(np.float32)
    alpha[mask] = 0
    edge = dist < 110
    alpha[edge & ~mask] = np.minimum(alpha[edge & ~mask], ((dist[edge & ~mask] - 70) / 40) * 255)
    arr[:, :, 3] = alpha.clip(0, 255).astype(np.uint8)

    out = Image.fromarray(arr, "RGBA")
    bbox = out.getbbox()
    if bbox:
        pad = 10
        l, t, r, b = bbox
        out = out.crop((max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad)))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "PNG")
    print(f"wrote {dst} {out.size}")


def main() -> None:
    for name, (folder, out) in MAP.items():
        src = SESSION / name
        if not src.exists():
            print("missing", src)
            continue
        key_and_trim(src, ROOT / folder / out)

    title = SESSION / "7.jpg"
    if title.exists():
        dst = ROOT / "ui" / "title-hero.jpg"
        dst.write_bytes(title.read_bytes())
        print("wrote", dst)

    thunder = ROOT / "ui" / "thunder.png"
    im = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((28, 12, 100, 148), 10, fill=(194, 58, 43, 255), outline=(42, 33, 24, 255), width=5)
    d.polygon([(72, 28), (44, 80), (64, 80), (52, 132), (92, 72), (70, 72)], fill=(240, 211, 106, 255))
    im.save(thunder)
    print("wrote", thunder)


if __name__ == "__main__":
    main()
