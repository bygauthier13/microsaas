"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

/** Hosts such as Vercel reject request bodies over 4.5 MB, so keep each upload under 4 MB. */
const MAX_TOTAL = 4 * 1024 * 1024;
const MAX_DIMENSION = 2000;

function mb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Resize large photos to at most 2000px and re-encode as JPEG. Other files pass through. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

export function PhotoInput({ id, name, accept }: { id: string; name: string; accept: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear the message when the surrounding form resets after a successful upload.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => {
      setStatus(null);
      setError(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    setError(null);
    if (!files.length) {
      setStatus(null);
      return;
    }
    input.setCustomValidity("Preparing your files…");
    setStatus("Preparing your files…");
    const prepared = await Promise.all(files.map(shrink));
    if (typeof DataTransfer !== "undefined") {
      const dt = new DataTransfer();
      for (const f of prepared) dt.items.add(f);
      input.files = dt.files;
    }
    const total = prepared.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL) {
      input.setCustomValidity("These files are too large to upload together.");
      setStatus(null);
      setError(`These files add up to ${mb(total)}; the limit is 4 MB per upload. Choose fewer files, or upload large PDFs one at a time.`);
      return;
    }
    input.setCustomValidity("");
    setStatus(`${prepared.length} file${prepared.length === 1 ? "" : "s"} ready to upload (${mb(total)})`);
  }

  return (
    <>
      <input
        ref={ref}
        id={id}
        name={name}
        type="file"
        multiple
        required
        accept={accept}
        onChange={onChange}
        className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium hover:file:bg-paper"
      />
      {error ? <p className="text-xs text-bad">{error}</p> : status ? <p className="text-xs text-muted">{status}</p> : null}
    </>
  );
}
