import json, subprocess, sys
V = sys.argv[1]
t = json.load(open(f"{V}/raw/timeline.json"))
start, end = t["start"], t["end"]
inputs, filters, labels = [], [], []
for i, line in enumerate(t["lines"]):
    inputs += ["-i", line["file"]]
    ms = max(0, int(round((line["at"] - start) * 1000)))
    filters.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
    labels.append(f"[a{i}]")
n = len(labels)
graph = ";".join(filters) + f";{''.join(labels)}amix=inputs={n}:normalize=0:dropout_transition=0,apad,atrim=0:{end - start:.2f},loudnorm=I=-16:TP=-1.5:LRA=11[out]"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-ac", "2", "-ar", "48000", f"{V}/raw/narration.wav"], check=True)
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{start:.2f}", "-i", f"{V}/raw/walkthrough.webm", "-i", f"{V}/raw/narration.wav",
                "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "25",
                "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-shortest", f"{V}/RepairClock-tour.mp4"], check=True)
print("done", round(end - start, 1), "s")
