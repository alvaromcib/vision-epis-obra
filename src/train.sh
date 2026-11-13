#!/usr/bin/env bash
# Fine-tune YOLO11n on Construction-PPE (CPU is enough; ~1 h with 2 cores).
set -euo pipefail
yolo detect train model=yolo11n.pt data=data.yaml epochs=15 imgsz=448 batch=16 device=cpu project=runs name=ppe
cp runs/ppe/weights/best.pt models/epis_yolo11n.pt
python src/report.py models/epis_yolo11n.pt datasets/construction-ppe
python shared/build.py .
