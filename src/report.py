"""Evaluate the trained PPE detector and export results + annotated examples for the dashboard.

Usage: python src/report.py <weights.pt> <dataset_dir>
"""
from pathlib import Path
import json
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "results"
IMG_OUT = ROOT / "docs" / "img"
OUT.mkdir(exist_ok=True)
IMG_OUT.mkdir(parents=True, exist_ok=True)

ES = {"helmet": "Casco", "gloves": "Guantes", "vest": "Chaleco", "boots": "Botas", "goggles": "Gafas",
      "Person": "Persona", "no_helmet": "Sin casco", "no_goggle": "Sin gafas", "no_gloves": "Sin guantes",
      "no_boots": "Sin botas", "forklift": "Carretilla", "no_vest": "Sin chaleco"}
OK = (25, 158, 112)      # aqua: PPE worn
BAD = (217, 89, 38)      # orange: missing PPE
NEUTRAL = (57, 135, 229) # blue: person / machine
VIOLATIONS = {"no_helmet", "no_vest", "no_goggle", "no_gloves", "no_boots"}


def color(name):
    return BAD if name in VIOLATIONS else NEUTRAL if name in ("Person", "forklift") else OK


def draw(img_path: Path, res, names, out_path: Path, conf=0.35):
    im = Image.open(img_path).convert("RGB")
    im.thumbnail((960, 960))
    sx = im.width / res.orig_shape[1]
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", max(12, im.width // 60))
    except OSError:
        font = ImageFont.load_default()
    found = []
    for b in res.boxes:
        if float(b.conf) < conf:
            continue
        n = names[int(b.cls)]
        x1, y1, x2, y2 = [v * sx for v in b.xyxy[0].tolist()]
        c = color(n)
        d.rectangle([x1, y1, x2, y2], outline=c, width=3)
        label = f"{ES[n]} {float(b.conf):.0%}"
        tw = d.textlength(label, font=font)
        d.rectangle([x1, y1 - font.size - 6, x1 + tw + 8, y1], fill=c)
        d.text((x1 + 4, y1 - font.size - 4), label, fill="white", font=font)
        found.append(n)
    im.save(out_path, quality=78)
    return found


def main(weights, data_dir):
    model = YOLO(weights)
    names = model.names
    data_dir = Path(data_dir)
    val = model.val(data=str(ROOT / "data.yaml"), imgsz=448, device="cpu", plots=False, verbose=False)
    per_class = {}
    for i, c in enumerate(val.box.ap_class_index):
        n = names[int(c)]
        per_class[n] = {"es": ES[n], "map50": round(float(val.box.ap50[i]), 3),
                        "precision": round(float(val.box.p[i]), 3), "recall": round(float(val.box.r[i]), 3)}

    # Image-level compliance check: does an image contain any worker without helmet?
    imgs = sorted((data_dir / "images" / "val").glob("*.jpg"))
    tp = fp = fn = tn = 0
    times = []
    viol_id = [k for k, v in names.items() if v == "no_helmet"][0]
    for p in imgs:
        lbl = data_dir / "labels" / "val" / (p.stem + ".txt")
        gt = lbl.exists() and any(int(l.split()[0]) == viol_id for l in lbl.read_text().splitlines() if l.strip())
        t0 = time.time()
        r = model.predict(str(p), imgsz=448, conf=0.35, device="cpu", verbose=False)[0]
        times.append(time.time() - t0)
        pr = any(int(c) == viol_id for c in r.boxes.cls.tolist())
        tp += gt and pr; fp += (not gt) and pr; fn += gt and not pr; tn += (not gt) and not pr

    # Annotated examples: prefer images with both compliant and non-compliant workers
    rng = np.random.default_rng(3)
    cand = [p for p in imgs if (data_dir / "labels" / "val" / (p.stem + ".txt")).exists()]
    scored = []
    for p in cand:
        cls = [int(l.split()[0]) for l in (data_dir / "labels" / "val" / (p.stem + ".txt")).read_text().splitlines() if l.strip()]
        n_viol = sum(names[c] in VIOLATIONS for c in cls)
        n_ok = sum(names[c] in ("helmet", "vest") for c in cls)
        scored.append((min(n_viol, 3) + min(n_ok, 3) + rng.random(), p))
    examples = []
    for _, p in sorted(scored, reverse=True)[:8]:
        r = model.predict(str(p), imgsz=448, conf=0.35, device="cpu", verbose=False)[0]
        found = draw(p, r, names, IMG_OUT / f"{p.stem}.jpg")
        examples.append({"img": f"img/{p.stem}.jpg",
                         "ok": sum(f in ("helmet", "vest") for f in found),
                         "viol": sum(f in VIOLATIONS for f in found),
                         "people": sum(f == "Person" for f in found)})

    results = {
        "dataset": "Ultralytics Construction-PPE (800 entrenamiento / 200 validación)",
        "model": "YOLO11n ajustado (2,6 M parámetros)",
        "overall": {"map50": round(float(val.box.map50), 3), "map50_95": round(float(val.box.map), 3),
                    "precision": round(float(val.box.mp), 3), "recall": round(float(val.box.mr), 3)},
        "per_class": per_class,
        "no_helmet_alert": {"tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
                            "recall": round(tp / max(tp + fn, 1), 3), "precision": round(tp / max(tp + fp, 1), 3)},
        "cpu_ms_per_image": round(1000 * float(np.median(times)), 0),
        "examples": examples,
    }
    (OUT / "results.json").write_text(json.dumps(results, ensure_ascii=False))
    print(json.dumps({k: results[k] for k in ("overall", "no_helmet_alert", "cpu_ms_per_image")}, indent=2))
    print(json.dumps(per_class, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
