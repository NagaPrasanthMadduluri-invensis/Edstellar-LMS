import { mkdir, rm } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/index.js";
import { requireAdmin, ok, err } from "@/lib/auth.js";

/* ── Manifest parser ── */
function parseManifest(xml) {
  // Schema version
  const verMatch = xml.match(/<schemaversion[^>]*?>([^<]+)<\/schemaversion>/i);
  const schemaVer = verMatch?.[1]?.trim() ?? "1.2";
  const version =
    schemaVer.includes("2004") ||
    schemaVer.toLowerCase().includes("cam") ||
    schemaVer.includes("1.3")
      ? "2004"
      : "1.2";

  // Title — from first <title> inside <organization>
  const orgMatch = xml.match(/<organization[^>]*?>[\s\S]*?<title>([\s\S]*?)<\/title>/i);
  const title = orgMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "SCORM Package";

  // Entry point — find SCO resource href (handles all namespace variants)
  const resourceSection = xml.match(/<resources[^>]*?>([\s\S]*?)<\/resources>/i)?.[1] ?? xml;

  // Try to find resource with scormtype="sco" (case-insensitive)
  const scoPattern = /(<resource\b[^>]*?scormtype="sco"[^>]*?>)/gi;
  let entryPoint = null;

  let m;
  while ((m = scoPattern.exec(resourceSection)) !== null) {
    const hrefMatch = m[1].match(/\bhref="([^"]+)"/i);
    if (hrefMatch) { entryPoint = hrefMatch[1]; break; }
  }

  // Fallback: any resource with href pointing to HTML
  if (!entryPoint) {
    const hrefMatch = resourceSection.match(/\bhref="([^"]+\.html?)"/i);
    entryPoint = hrefMatch?.[1] ?? null;
  }

  // Last fallback
  if (!entryPoint) entryPoint = "index.htm";

  return { version, title, entryPoint };
}

export async function POST(request) {
  const payload = requireAdmin(request);
  if (!payload) return err("Unauthorized", 401);

  let formData;
  try { formData = await request.formData(); }
  catch { return err("Invalid multipart form data", 400); }

  const file = formData.get("scorm_package");
  if (!file || typeof file === "string") return err("No SCORM package file received", 422);

  if (!file.name.toLowerCase().endsWith(".zip"))
    return err("File must be a .zip SCORM package", 422);

  const uuid = randomUUID();
  const uploadDir = join(process.cwd(), "public", "scorm", uuid);

  try {
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract ZIP
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(buffer);

    await mkdir(uploadDir, { recursive: true });
    zip.extractAllTo(uploadDir, true);

    // Find manifest
    const manifestPath = join(uploadDir, "imsmanifest.xml");
    if (!existsSync(manifestPath)) {
      await rm(uploadDir, { recursive: true, force: true });
      return err("imsmanifest.xml not found — not a valid SCORM package", 422);
    }

    const manifestXml = readFileSync(manifestPath, "utf-8");
    const { version, title, entryPoint } = parseManifest(manifestXml);

    // Allow caller to override title
    const customTitle = (formData.get("title") ?? "").toString().trim();
    const finalTitle = customTitle || title;

    const courseId = formData.get("course_id");

    const db = await getDb();
    const result = await db.execute({
      sql: `INSERT INTO scorm_packages (title, version, entry_point, package_dir, course_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        finalTitle,
        version,
        entryPoint,
        uuid,
        courseId ? Number(courseId) : null,
        payload.userId,
      ],
    });

    const newPkg = (await db.execute({
      sql: "SELECT * FROM scorm_packages WHERE id = ?",
      args: [result.lastInsertRowid],
    })).rows[0];

    return ok({ package: newPkg }, 201);
  } catch (e) {
    // Clean up on any error
    await rm(uploadDir, { recursive: true, force: true }).catch(() => {});
    console.error("[scorm/upload]", e);
    return err("Failed to process SCORM package", 500);
  }
}

export const config = { api: { bodyParser: false } };
