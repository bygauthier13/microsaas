"""Splits each step's voice clip into its sentences (one caption each) and writes audio/lines.json.

With audio/<id>.mp3 present, each sentence break is the pause ffmpeg finds nearest to where the text
says it should be. Without the audio (to preview the visuals), times are estimated from the clip
lengths in voice.json and the length of each sentence.
"""
import json, os, re, subprocess, sys

base = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
steps = json.load(open(f"{here}/tutorial.json"))
voice = json.load(open(f"{base}/voice.json")) if os.path.exists(f"{base}/voice.json") else {}


def weight(text):
    return len(re.sub(r"\[[^\]]*\]\s*", "", text)) + 10  # characters, plus a pause after each sentence


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def silences(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


out = []
for s in steps:
    path = f"{base}/audio/{s['id']}.mp3"
    texts = [l["say"] for l in s["lines"]]
    w = [weight(t) for t in texts]
    have = os.path.exists(path)
    total = probe(path) if have else voice[s["id"]]["seconds"]
    head, tail = 0.05, total - 0.1
    gaps = []
    if have:
        sil = silences(path)
        if sil and sil[0][0] <= 0.02 and sil[0][1]:
            head = sil[0][1]
            sil = sil[1:]
        if sil and (sil[-1][1] is None or sil[-1][1] >= total - 0.02):
            tail = sil[-1][0]
            sil = sil[:-1]
        gaps = [(a, b) for a, b in sil if b]
    span = tail - head
    cuts, lo = [], head
    for i in range(1, len(texts)):
        expect = head + span * sum(w[:i]) / sum(w)
        near = [g for g in gaps if g[0] > lo and abs((g[0] + g[1]) / 2 - expect) < 1.6]
        best = max(near, key=lambda g: (g[1] - g[0]) - 0.25 * abs((g[0] + g[1]) / 2 - expect), default=None)
        if best:
            cuts.append(best)
            lo = best[1]
        else:
            cuts.append((expect, expect))
            lo = expect
    edges = [max(0.0, head - 0.05)] + [min((a + b) / 2, a + 0.25) for a, b in cuts]
    starts = [edges[0]] + [max((a + b) / 2, b - 0.2) for a, b in cuts]
    ends = edges[1:] + [min(total, tail + 0.15)]
    for k, line in enumerate(s["lines"]):
        out.append({"id": s["id"], "k": k, "file": path, "from": round(starts[k], 3), "to": round(ends[k], 3),
                    "seconds": round(ends[k] - starts[k], 3), "cap": line["cap"], "estimated": not have})

json.dump(out, open(f"{base}/audio/lines.json", "w"), indent=1)
for l in out:
    print(f"{l['id']:>5} {l['k']} {l['from']:6.2f}-{l['to']:6.2f} ({l['seconds']:.2f}s){' est.' if l['estimated'] else ''}  {l['cap'][:60]}")
