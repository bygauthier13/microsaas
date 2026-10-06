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

## Step-by-step tutorial

Builds `RepairClock-tutorial.mp4` (about 2¼ minutes, 1280×720): a brand-new agency goes through the
8 steps — sign up, agency details, import homes, log a report, landlord approval, investigation and
written summary, invite a colleague, choose a plan — with a step banner, "Click …" tips and captions.
The voice is Eleanor (ElevenLabs Eleven v3, generated through Runway's text-to-speech).

- `tutorial.json`: what is said (`say`, with delivery tags such as `[cheerfully]`) and the caption
  for each sentence. One voice clip per entry.
- `tutorial-homes.csv`: the spreadsheet imported in step 3.
- `tutorial.mjs`: the recorder. It captures the browser's own frames at a steady 25 fps
  (Playwright's built-in recorder stretches the video while animations run) and cuts out waits
  for the server once the voice has finished.
- `lines.py`: splits each clip into its sentences at the pauses, so each caption and action
  starts with its sentence.

With the app built (`npm run build`) and `WORK` an empty folder outside the repo:

1. For each entry in `tutorial.json`, join its `say` lines with spaces and generate the speech
   (model `eleven_v3`, voice `Eleanor`, language `en`, seed `4217`). Save the clips as
   `$WORK/audio/<id>.mp3` and their lengths in `$WORK/voice.json`, e.g. `{"intro": {"seconds": 8.48}, …}`.
2. Start the app on an empty database (the recorder signs up `fiona@lothianforth.example.com`):

   ```bash
   PGLITE_DIR=$(mktemp -d) APP_URL=http://localhost:3600 SUPPORT_EMAIL=hello@bygauthier.com npx next start -p 3600
   ```

3. Then:

   ```bash
   python3 scripts/video/lines.py "$WORK"                                # sentence timings → audio/lines.json
   node scripts/video/tutorial.mjs "$WORK"                               # walkthrough → raw/
   python3 scripts/video/mux.py "$WORK" "$WORK/RepairClock-tutorial.mp4" # + voice → final video
   ```

Without the clips in `audio/`, `lines.py` estimates the sentence timings from `voice.json` and
`mux.py` makes a silent preview, which is enough to check the visuals.
