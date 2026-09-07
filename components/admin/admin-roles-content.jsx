"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { Save, RotateCcw } from "lucide-react";

/* ── Static data ── */
const PERMISSIONS = [
  { id: "view_dashboard",    label: "View Dashboard"      },
  { id: "view_employees",    label: "View All Employees"  },
  { id: "edit_employees",    label: "Edit Employees"      },
  { id: "upload_content",    label: "Upload Content"      },
  { id: "build_assessments", label: "Build Assessments"   },
  { id: "assign_learning",   label: "Assign Learning"     },
  { id: "manage_users",      label: "Manage Users"        },
  { id: "view_reports",      label: "View Reports"        },
  { id: "manage_courses",    label: "Manage Courses"      },
  { id: "manage_assessments",label: "Manage Assessments"  },
  { id: "manage_departments",label: "Manage Departments"  },
  { id: "view_certificates", label: "View Certificates"   },
];

const DEFAULTS = {
  admin:   new Set(PERMISSIONS.map((p) => p.id)),
  manager: new Set(["view_dashboard", "view_reports"]),
  learner: new Set(),
};

const ROLES = [
  { key: "admin",   label: "ADMIN",   users: 1,  color: { border: "border-navy/20",    badge: "bg-paper-cream text-navy border-navy/20",    count: "text-navy"    } },
  { key: "manager", label: "MANAGER", users: 2,  color: { border: "border-border",   badge: "bg-paper-cream text-ink/70 border-border",  count: "text-ink/70"   } },
  { key: "learner", label: "LEARNER", users: 18, color: { border: "border-navy/20", badge: "bg-paper-cream text-navy border-navy/20", count: "text-navy" } },
];

const LOCKED = new Set(["manage_users"]); // always on for admin

export function AdminRolesContent() {
  const [perms, setPerms] = useState({
    admin:   new Set(DEFAULTS.admin),
    manager: new Set(DEFAULTS.manager),
    learner: new Set(DEFAULTS.learner),
  });
  const [saved, setSaved] = useState(false);

  const toggle = (role, permId) => {
    if (role === "admin" && LOCKED.has(permId)) return;
    setPerms((prev) => {
      const next = new Set(prev[role]);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return { ...prev, [role]: next };
    });
    setSaved(false);
  };

  const reset = () => {
    setPerms({ admin: new Set(DEFAULTS.admin), manager: new Set(DEFAULTS.manager), learner: new Set(DEFAULTS.learner) });
    setSaved(false);
  };

  const save = () => setSaved(true);

  return (
    <Box className="space-y-6">

      {/* ── Header actions ── */}
      <Box className="flex items-center justify-between gap-3 flex-wrap">
        <Text as="p" className="text-sm text-muted-foreground">
          Control what each role can see and do — enforced live across the app
        </Text>
        <Box className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <Button size="sm" className="h-9 bg-navy hover:bg-navy-soft text-paper gap-2 px-4" onClick={save}>
            <Save className="h-3.5 w-3.5" />
            {saved ? "Saved!" : "Save & Apply"}
          </Button>
        </Box>
      </Box>

      {/* ── Info banner ── */}
      <Box className="border-l-4 border-navy/20 bg-paper-cream rounded-r-xl px-4 py-3">
        <Text as="p" className="text-sm text-navy leading-relaxed">
          <Text as="span" className="font-bold">This matrix is enforced.</Text>{" "}
          Turning a permission off removes it from the navigation, blocks the page if accessed directly, and stops the underlying action.
          Changes apply on <Text as="span" className="font-semibold">Save & Apply</Text>.{" "}
          &ldquo;Manage Users&rdquo; is locked on for Admin so you can&apos;t lock yourself out.
        </Text>
      </Box>

      {/* ── Role summary cards ── */}
      <Box className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROLES.map((role) => {
          const count = perms[role.key].size;
          return (
            <Card key={role.key} className={`border-l-4 ${role.color.border}`}>
              <CardContent className="p-3.5">
                <Box className="flex items-center justify-between gap-2 mb-1.5">
                  <Badge className={`text-[10px] font-bold tracking-widest border ${role.color.badge}`}>
                    {role.label}
                  </Badge>
                  <Text as="span" className="text-xs text-muted-foreground">{role.users} user{role.users !== 1 ? "s" : ""}</Text>
                </Box>
                <Box className="flex items-baseline gap-1.5">
                  <Text as="h2" className={`text-2xl font-extrabold leading-none ${role.color.count}`}>{count}</Text>
                  <Text as="p" className="text-xs text-muted-foreground">/ {PERMISSIONS.length} permissions</Text>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* ── Permission Matrix ── */}
      <Card>
        <CardContent className="p-0">
          <Box className="flex flex-col gap-1 px-4 py-4 border-b sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <Text as="h3" className="text-base font-bold">Permission Matrix</Text>
            <Text as="p" className="text-xs text-muted-foreground">
              Admin permissions are editable except &ldquo;Manage Users&rdquo; (lockout safety). Learner is the baseline tier.
            </Text>
          </Box>

          <Box className="overflow-x-auto">
          {/* Table header */}
          <Box className="grid min-w-[34rem] grid-cols-[1fr_120px_120px_120px] px-6 py-3 border-b bg-muted/30">
            <Text as="span" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Permission</Text>
            {ROLES.map((r) => (
              <Text key={r.key} as="span"
                className={`text-[11px] font-bold uppercase tracking-widest text-center ${
                  r.key === "admin" ? "text-navy" : r.key === "manager" ? "text-ink/70" : "text-navy"
                }`}>
                {r.label}
              </Text>
            ))}
          </Box>

          {/* Permission rows */}
          {PERMISSIONS.map((perm, idx) => (
            <Box
              key={perm.id}
              className={`grid min-w-[34rem] grid-cols-[1fr_120px_120px_120px] items-center px-6 py-3.5 ${
                idx !== PERMISSIONS.length - 1 ? "border-b" : ""
              } hover:bg-muted/20 transition-colors`}
            >
              <Text as="span" className="text-sm font-medium">{perm.label}</Text>
              {ROLES.map((role) => {
                const isLocked = role.key === "admin" && LOCKED.has(perm.id);
                const checked  = perms[role.key].has(perm.id);
                return (
                  <Box key={role.key} className="flex items-center justify-center">
                    <Checkbox
                      checked={checked}
                      disabled={isLocked}
                      onCheckedChange={() => toggle(role.key, perm.id)}
                      className={`h-5 w-5 rounded ${
                        isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : role.key === "admin"
                          ? "data-[state=checked]:bg-navy data-[state=checked]:border-navy/20"
                          : role.key === "manager"
                          ? "data-[state=checked]:bg-navy data-[state=checked]:border-border"
                          : "data-[state=checked]:bg-navy data-[state=checked]:border-navy/20"
                      }`}
                    />
                  </Box>
                );
              })}
            </Box>
          ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
