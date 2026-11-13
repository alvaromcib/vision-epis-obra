# Visión artificial para seguridad en obra: detección de EPIs

**Dashboard interactivo:** https://alvaromcib.github.io/vision-epis-obra/

![Dashboard](docs/portfolio/cover.jpg)

Detector que identifica en imágenes de obra **casco, chaleco, guantes, gafas y botas**, y también cuándo **faltan**, para generar alertas de prevención de riesgos desde las cámaras que ya hay en obra. Modelo ligero que funciona **en CPU**, sin GPU ni servicios en la nube.

Proyecto demostrativo con el dataset público Construction-PPE de Ultralytics. No usa datos de clientes.

## Resultados (200 imágenes de validación)

| Métrica | Valor |
|---|---|
| Imágenes con alguien sin casco que generan alerta | 62 de 91 (68 %) |
| Falsas alarmas «sin casco» | 0 de 109 imágenes |
| mAP50 casco / chaleco / persona | 0,72 / 0,85 / 0,89 |
| mAP50 global (12 clases) | 0,66 |
| Tiempo por imagen en CPU | ~53 ms |

La alerta está calibrada para no molestar con falsas alarmas. En producción se confirma en varios fotogramas seguidos, lo que sube la detección real por persona y evento. Las clases con pocos ejemplos (por ejemplo «sin gafas») necesitan más datos del cliente para ser fiables.

## Estructura

- `src/train.sh`: ajuste de YOLO11n sobre el dataset (15 épocas, 448 px, CPU).
- `src/report.py`: evaluación por clase, alerta por imagen, tiempos y ejemplos anotados.
- `models/epis_yolo11n.pt`: pesos entrenados (2,6 M parámetros).
- `docs/`: dashboard autocontenido.

```bash
pip install -r requirements.txt
yolo detect predict model=models/epis_yolo11n.pt source=tu_imagen.jpg imgsz=448
```

## Cómo se aplicaría en una obra

1. Cámaras IP (RTSP) existentes o una cámara por zona crítica.
2. Detector en un PC local o un equipo edge: el vídeo no sale de la obra.
3. Alertas al responsable de prevención y registro de incidencias por zona y franja horaria.
4. Ajuste con imágenes propias de la obra: uniformes, colores de casco, iluminación.

---

**Álvaro Martín Coll** · Físico · Ingeniero de IA para industria y construcción · [Perfil en Malt](https://www.malt.com/profile/alvaromartincoll)

Datos y modelo base: [Ultralytics](https://docs.ultralytics.com/datasets/detect/construction-ppe/) (AGPL-3.0). Este repositorio se distribuye bajo AGPL-3.0.
