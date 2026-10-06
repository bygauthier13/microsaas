import { and, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { byteStream } from "@/lib/http";

export const dynamic = "force-dynamic";

const INLINE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function GET(_req: Request, { params }: RouteContext<"/api/documents/[id]">) {
  const { id } = await params;
  const auth = await getAuth();
  if (!auth?.org) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const db = await getDb();
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.orgId, auth.org.id), eq(documents.id, id)))
    .limit(1);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  const disposition = INLINE.has(doc.mime) ? "inline" : "attachment";
  const ascii = doc.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(byteStream(new Uint8Array(doc.data)), {
    headers: {
      "content-type": doc.mime,
      "content-disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      // Uploaded images are served from our origin: forbid them from running anything.
      // (Not applied to PDFs — Chrome refuses to open its PDF viewer in a sandboxed context.)
      ...(doc.mime.startsWith("image/") ? { "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
