import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
base, voice, speed = sys.argv[1], sys.argv[2], float(sys.argv[3])
k = Kokoro(f"{base}/models/kokoro-v1.0.onnx", f"{base}/models/voices-v1.0.bin")
out = []
for line in json.load(open(f"{base}/narration.json")):
    parts = []
    for cap in line["captions"]:
        samples, sr = k.create(cap, voice=voice, speed=speed, lang="en-gb")
        parts.append({"text": cap, "seconds": round(len(samples) / sr, 3)})
        sf.write(f"{base}/audio/{line['id']}-{len(parts)}.wav", samples, sr)
    out.append({"id": line["id"], "parts": parts, "seconds": round(sum(p["seconds"] for p in parts), 2)})
json.dump(out, open(f"{base}/audio/durations.json", "w"), indent=1)
print([(o["id"], o["seconds"]) for o in out], "total", round(sum(o["seconds"] for o in out), 1))
