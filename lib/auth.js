import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "edstellar-lms-demo-2026";

/* ─── JWT ─── */

export function signToken(payload, days = 7) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims = { ...payload, exp: Math.floor(Date.now() / 1000) + days * 86400 };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ─── Password hashing ─── */

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

export function verifyPassword(password, stored) {
  try {
    const [hash, salt] = stored.split(".");
    const hashBuf = Buffer.from(hash, "hex");
    const supplied = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuf, supplied);
  } catch {
    return false;
  }
}

/* ─── Request helpers ─── */

export function getTokenFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export function requireAuth(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(request) {
  const payload = requireAuth(request);
  if (!payload || payload.role !== "admin") return null;
  return payload;
}

/* ─── JSON response helpers ─── */

export function ok(data, status = 200) {
  return Response.json(data, { status });
}

export function err(message, status = 400, errors = null) {
  return Response.json({ message, ...(errors && { errors }) }, { status });
}
