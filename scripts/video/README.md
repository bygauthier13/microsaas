# Product videos

Two videos, both recorded from the app itself and voiced by Eleanor (ElevenLabs Eleven v3,
generated with Runway's text-to-speech):

- **Overview**, about 90 seconds (`narration.json`, `record.mjs`): what RepairClock does, shown in
  the demo workspace. On the site as `public/videos/overview.mp4`.
- **Setup guide**, about 2¼ minutes (`tutorial.json`, `tutorial.mjs`, `tutorial-homes.csv`): a new
  agency goes through the 8 steps, from signing up to choosing a plan, with a step banner, "Click …"
  tips and captions. On the site as `public/videos/setup-guide.mp4`, with its chapters in
  `src/lib/videos.ts`.

`studio.mjs` holds what both share: the overlay drawn over the app (cursor, captions, highlights,
tips, step banner, full-screen cards), a recorder that captures the browser's own frames at a steady
25 fps (Playwright's built-in recorder stretches the video while animations run) and cuts out waits
for the server once the voice has finished, and the timing of the voice lines.

## Making one

Needs ffmpeg and the app built (`npm run build`). `WORK` is an empty folder outside the repo and
`SCRIPT` is `narration.json` for the overview or `tutorial.json` for the setup guide.

1. **Voice.** For each entry in the script, join its `say` lines with spaces and generate the speech
   (model `eleven_v3`, voice `Eleanor`, language `en`, seed `4217`). Save the clips as
   `$WORK/audio/<id>.mp3`.
2. **App.** Start it on an empty database. The setup guide signs up `fiona@lothianforth.example.com`,
   so it needs a fresh one each time:

   ```bash
   PGLITE_DIR=$(mktemp -d) APP_URL=http://localhost:3600 SUPPORT_EMAIL=hello@bygauthier.com npx next start -p 3600
   ```

3. **Overview only:** the evidence pack pages it shows (`pip install pymupdf` for the second step):

   ```bash
   node scripts/video/evidence.mjs "$WORK"          # demo evidence pack → evidence/evidence.pdf
   python3 scripts/video/render_pdf.py "$WORK"      # its first pages → evidence/*.png
   ```

4. **Record and mix:**

   ```bash
   python3 scripts/video/lines.py "$WORK" scripts/video/$SCRIPT     # sentence timings → audio/lines.json
   node scripts/video/record.mjs "$WORK"                            # or tutorial.mjs → raw/
   python3 scripts/video/mux.py "$WORK" "$WORK/video.mp4"           # voice + walkthrough
   ```

Each caption is one sentence of a clip: `lines.py` cuts the clips at their pauses and evens out their
loudness. Without the clips in `audio/`, it estimates the timings from `$WORK/voice.json` (the clip
lengths, e.g. `{"intro": {"seconds": 8.48}}`) and `mux.py` makes a silent preview, which is enough to
check the visuals.

## On the site

The site plays smaller copies, each with a poster image, and only loads a video when someone
presses play:

```bash
ffmpeg -i "$WORK/video.mp4" -c:v libx264 -preset slow -crf 25 -tune stillimage -pix_fmt yuv420p \
  -c:a aac -b:a 112k -movflags +faststart public/videos/setup-guide.mp4
ffmpeg -ss 4.2 -i "$WORK/video.mp4" -frames:v 1 -q:v 3 public/videos/setup-guide.jpg
```

If the setup guide's timing changes, update the chapter times in `src/lib/videos.ts`: each step
starts at its first line's `at` minus `start` in `raw/timeline.json`.
