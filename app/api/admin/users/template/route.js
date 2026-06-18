import { requireAdmin, err } from "@/lib/auth.js";
import * as XLSX from "xlsx";

export async function GET(request) {
  if (!requireAdmin(request)) return err("Unauthorized", 401);

  const wb = XLSX.utils.book_new();

  /* ── Instruction row + headers + sample rows ── */
  const data = [
    // Row 1: instruction banner (merged across all 8 columns)
    ["⚠ Instructions: Fill in one learner per row. Password column is optional — leave blank to use default password: Edstellar@123", "", "", "", "", "", "", ""],
    // Row 2: column headers
    ["Employee ID", "First Name", "Last Name", "Email", "Department", "Location", "Job Role", "Password"],
    // Sample rows
    ["EMP-001", "Alice",  "Johnson",  "alice@company.com",  "Engineering", "Bangalore", "Software Engineer",  ""],
    ["EMP-002", "Bob",    "Smith",    "bob@company.com",    "Sales",       "Mumbai",    "Sales Manager",      ""],
    ["EMP-003", "Carol",  "Williams", "carol@company.com",  "HR",          "Delhi",     "HR Coordinator",     ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  /* Column widths */
  ws["!cols"] = [
    { wch: 14 },  // Employee ID
    { wch: 16 },  // First Name
    { wch: 16 },  // Last Name
    { wch: 32 },  // Email
    { wch: 18 },  // Department
    { wch: 16 },  // Location
    { wch: 24 },  // Job Role
    { wch: 20 },  // Password
  ];

  /* Merge instruction row across all 8 columns */
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Learner Upload");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Learner_Upload_Template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
