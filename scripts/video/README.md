# Explainer video

Builds `RepairClock-tour.mp4` (about 90 seconds, 1280×720): a scripted walkthrough of the demo
workspace with a cursor, highlights and captions, plus a British English voice-over made
offline with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (free, no account).

Needs Python 3, ffmpeg and the app running locally on port 3600:

```bash
npm run build
PGLITE_DIR=/tmp/rc-video-db SUPPORT_EMAIL=hello@bygauthier.com npx next start -p 3600
```

Then, with `WORK` an empty folder outside the repo:

```bash
cp scripts/video/narration.json "$WORK"/ && mkdir -p "$WORK"/audio "$WORK"/models "$WORK"/raw
python3 -m venv "$WORK"/venv && "$WORK"/venv/bin/pip install kokoro-onnx soundfile pymupdf
# Voice model, from the kokoro-onnx GitHub release "model-files-v1.0":
curl -L -o "$WORK"/models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o "$WORK"/models/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

"$WORK"/venv/bin/python scripts/video/tts.py "$WORK" bf_emma 0.92   # voice lines → audio/
node scripts/video/evidence.mjs "$WORK"                              # evidence pack PDF
"$WORK"/venv/bin/python scripts/video/render_pdf.py "$WORK"          # its pages as PNG
node scripts/video/record.mjs "$WORK"                                # walkthrough → raw/
python3 scripts/video/mux.py "$WORK"                                 # → RepairClock-tour.mp4
```

Edit `narration.json` to change what is said (each caption is one voice line); the scene
actions are in `record.mjs`. Other British voices: `bm_george`, `bf_isabella`, `bm_fable`.
