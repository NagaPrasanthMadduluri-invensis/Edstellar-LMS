"use client";

import { AuthProvider } from "@/providers/auth-provider";

export default function ScormPlayerLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
