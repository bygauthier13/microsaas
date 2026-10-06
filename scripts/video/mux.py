"""Lays the voice lines over the recorded walkthrough: python3 mux.py WORK [OUTPUT.mp4].

Each timeline line plays `file` (or just its from-to part) at its recorded time. Lines whose file
is missing are left silent, so the visuals can be previewed before the voice is ready.
"""
import json, os, subprocess, sys

V = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else f"{V}/RepairClock-tour.mp4"
t = json.load(open(f"{V}/raw/timeline.json"))
start, end = t["start"], t["end"]
inputs, filters, labels = [], [], []
for line in t["lines"]:
    if not os.path.exists(line["file"]):
        continue
    i = len(labels)
    inputs += ["-i", line["file"]]
    ms = max(0, int(round((line["at"] - start) * 1000)))
    trim = f"atrim=start={line['from']}:end={line['to']},asetpts=PTS-STARTPTS," if line.get("to") else ""
    filters.append(f"[{i}:a]{trim}aresample=48000,adelay={ms}|{ms}[a{i}]")
    labels.append(f"[a{i}]")
length = f"{end - start:.2f}"
if labels:
    graph = ";".join(filters) + f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,apad,atrim=0:{length},loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-ac", "2", "-ar", "48000", f"{V}/raw/narration.wav"], check=True)
else:
    print("no voice files yet: the video will be silent")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", length, f"{V}/raw/narration.wav"], check=True)
video = t.get("video", f"{V}/raw/walkthrough.webm")
skip = start - t.get("videoStart", 0)  # the video's first frame is at videoStart on the timeline
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{skip:.3f}", "-i", video, "-i", f"{V}/raw/narration.wav",
                "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "25",
                "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out], check=True)
print("done", out, round(end - start, 1), "s")
