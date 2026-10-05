import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RepairClock — damp and mould deadlines for letting agents and landlords";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [regular, semibold] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/IBMPlexSans-400.ttf")),
    readFile(join(process.cwd(), "assets/fonts/IBMPlexSans-600.ttf")),
  ]);
  const rows = [
    ["10", "working days to investigate"],
    ["3", "to issue the written summary"],
    ["5", "to start repairs"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#14213d", color: "#f6f3ec", padding: "64px 72px", fontFamily: "Plex" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 600 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, border: "3px solid #f6f3ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#f08a4b" }} />
            </div>
            RepairClock
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 26, color: "#f3b183", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Scotland · in force from 6 October 2026</div>
            <div style={{ fontSize: 66, fontWeight: 600, lineHeight: 1.08, maxWidth: 980 }}>Every damp &amp; mould report now runs on a legal clock.</div>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {rows.map(([n, label]) => (
              <div key={n} style={{ display: "flex", alignItems: "baseline", gap: 12, fontSize: 28, color: "rgba(246,243,236,0.85)" }}>
                <span style={{ fontSize: 54, fontWeight: 600, color: "#f08a4b" }}>{n}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex", data: regular, style: "normal", weight: 400 },
        { name: "Plex", data: semibold, style: "normal", weight: 600 },
      ],
    },
  );
}
