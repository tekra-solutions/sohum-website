import { accessibleApplication } from "@/lib/ats/access";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resumeFiles } from "@/db/schema";
import { getSessionAdmin } from "@/lib/auth/session";
import { downloadResume } from "@/lib/storage/resumes";
import { audit } from "@/lib/audit";

/**
 * Authenticated resume download.
 *
 * The storage path never reaches the browser. This route checks the session,
 * streams the object through the server, and records the access in the audit
 * log — resumes are private HR data and every read is attributable.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!await accessibleApplication(id, admin)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await db.query.resumeFiles.findFirst({
    where: eq(resumeFiles.applicationId, id),
  });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const disposition = new URL(request.url).searchParams.get("download") === "1"
    ? "attachment"
    : "inline";

  try {
    const blob = await downloadResume(file.storagePath);
    await audit({
      adminId: admin.id,
      action: disposition === "attachment" ? "ADMIN_DOWNLOADED_RESUME" : "ADMIN_VIEWED_RESUME",
      entityType: "application",
      entityId: id,
      metadata: { filename: file.originalFilename, disposition },
    });

    // Quote the filename so spaces and commas cannot break the header.
    const safeName = file.originalFilename.replace(/[^\x20-\x7E]|["\\]/g, "_");
    return new NextResponse(blob.stream(), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Content-Length": String(file.fileSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[resume] download failed", {
      applicationId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not retrieve the file." }, { status: 502 });
  }
}
