"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { Card } from "@/components/ui/card";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { adminNav } from "@/lib/nav-config";
import { adminPageRule, flattenSections, itemAllowed } from "@/lib/permissions";

/**
 * Stops an admin page rendering for somebody whose role lacks its permission.
 *
 * The sidebar already hides the link; this covers a typed or bookmarked URL,
 * which used to render the page and then fill it with 403 errors. The rule
 * for each page is its sidebar item (`adminPageRule`), so the page and its
 * link can never disagree. Navigation aid only: the API is the boundary.
 *
 * Landing on the dashboard without `view_dashboard` (the admin portal's
 * default page) moves straight to the first page the person may open, rather
 * than greeting them with a refusal.
 */
export function AdminPageGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const rule = adminPageRule(pathname, adminNav.sections);
  const allowed = !rule || itemAllowed(user, rule);
  const firstAllowed = flattenSections(adminNav.sections).find(
    (item) => (item.permission || item.anyPermission) && itemAllowed(user, item),
  );
  const fallback =
    firstAllowed?.href ??
    (user?.role === "trainer" ? "/trainer/sessions" : user?.role === "admin" ? null : "/dashboard");
  const autoMove = !allowed && pathname === "/admin/dashboard" && fallback;

  useEffect(() => {
    if (autoMove) router.replace(fallback);
  }, [autoMove, fallback, router]);

  if (allowed) return children;
  if (autoMove) return null;

  return (
    <Card className="mx-auto mt-10 max-w-md gap-0 p-6 text-center" data-testid="no-access">
      <Box className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </Box>
      <Text as="h2" className="text-base font-bold">
        You don&apos;t have access to this page
      </Text>
      <Text as="p" className="mt-1 text-sm text-muted-foreground">
        Your role does not include the permission this page needs. Ask an admin
        to add it on Roles &amp; Permissions.
      </Text>
      {fallback && (
        <Link
          href={fallback}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-navy px-4 text-sm font-medium text-paper hover:bg-navy-soft"
        >
          Go to a page you can open
        </Link>
      )}
    </Card>
  );
}
