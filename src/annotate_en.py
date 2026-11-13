"""Redraw the dashboard's example images with English labels (docs/img/en/) for the English dashboard.

Uses the same model, threshold and drawing code as report.py, on the same validation images
listed in results/results.json.
Usage: python src/annotate_en.py <weights.pt> <dataset_dir>
"""
import json
import sys
from pathlib import Path

from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
from report import EN, ROOT, draw  # noqa: E402

weights, data_dir = sys.argv[1], Path(sys.argv[2])
out = ROOT / "docs" / "img" / "en"
out.mkdir(parents=True, exist_ok=True)
model = YOLO(weights)
for ex in json.loads((ROOT / "results" / "results.json").read_text())["examples"]:
    stem = Path(ex["img"]).stem
    src = data_dir / "images" / "val" / f"{stem}.jpg"
    r = model.predict(str(src), imgsz=448, conf=0.35, device="cpu", verbose=False)[0]
    draw(src, r, model.names, out / f"{stem}.jpg", labels=EN)
    print(out / f"{stem}.jpg")
