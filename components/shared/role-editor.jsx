"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";

/**
 * The role-editing primitives, shared by the two screens that edit roles —
 * `specs/rbac.md` §3.9.
 *
 * There are two of those screens now: an org admin editing their own
 * organization's roles (`/admin/roles`) and a super-admin editing any
 * organization's (`/platform/organizations/[id]`). They differ in which
 * organization they target, who gets signed out, and what surrounds the
 * table — and in nothing else. So the matrix, the add-role dialog and the
 * dirty-set calculation live here rather than being written twice, per
 * TASTE §5.2: portal-agnostic domain UI belongs in `components/shared/`.
 *
 * These components hold NO state and make NO API calls. The caller owns the
 * draft and the writes, because the endpoints differ (`/admin/roles` versus
 * `/platform/organizations/:id/roles`) even though the payloads do not.
 */

export const PORTALS = [
  { value: "admin", label: "Admin portal" },
  { value: "learner", label: "Learner portal" },
  { value: "trainer", label: "Trainer portal" },
];

export const SCOPES = [
  { value: "org", label: "Whole organization" },
  { value: "department", label: "Own department" },
  { value: "self", label: "Only themselves" },
];

export const EMPTY_ROLE = {
  key: "",
  label: "",
  portal: "learner",
  scope: "self",
  permissions: [],
};

export function portalLabel(portal) {
  return PORTALS.find((p) => p.value === portal)?.label ?? portal;
}

export function scopeLabel(scope) {
  return SCOPES.find((s) => s.value === scope)?.label ?? scope;
}

/** `{ roleId: Set<permission> }` from the server's role list, for editing. */
export function draftFromRoles(roles) {
  return Object.fromEntries((roles ?? []).map((r) => [r.id, new Set(r.permissions)]));
}

/**
 * The roles whose ticks actually changed — so a save writes only those.
 *
 * Set comparison rather than array equality: the draft is a Set and the
 * server's list is an ordered array, and comparing them as arrays would call
 * every role dirty the moment the catalogue order and the grant order differed.
 */
export function dirtyRoles(roles, draft) {
  return (roles ?? []).filter((role) => {
    const before = new Set(role.permissions);
    const after = draft[role.id] ?? new Set();
    if (before.size !== after.size) return true;
    for (const p of after) if (!before.has(p)) return true;
    return false;
  });
}

/**
 * The permission matrix: one row per catalogued permission, one column per role.
 *
 * `gridTemplateColumns` is the one inline style in here and it cannot be a
 * Tailwind class (TASTE §8): the column count is the organization's role
 * count, known only at runtime. It is written once, here, instead of once per
 * screen — which is most of the reason this component was extracted.
 *
 * Both tracks have a FLOOR, and that is the whole trick. This was
 * `1fr repeat(N, 7rem)` inside a fixed `min-w-[40rem]`, which is fine at three
 * roles and broken at six: 6 x 7rem is 42rem on its own, so there was nothing
 * left for the `1fr` and the label column collapsed to about 40px — every
 * permission name wrapping to one letter per line. A `1fr` track has an
 * implicit minimum of `auto`, but `auto` loses to a peer with a fixed size, so
 * the fix is to say the minimum out loud with `minmax()` and to make the
 * container's own minimum grow with the role count instead of being a guess.
 * Same failure as a `flex-1` sibling with no `basis`.
 */
export function RoleMatrix({ roles, catalogue, draft, onToggle, title, hint }) {
  const columns = `minmax(11rem, 1fr) repeat(${roles.length}, 7rem)`;
  // 11rem of label plus 7rem per role. The wrapper scrolls horizontally, so
  // being wider than the viewport is correct here — being squeezed is not.
  const grid = { gridTemplateColumns: columns, minWidth: `${11 + roles.length * 7}rem` };

  return (
    <Card className="gap-0">
      <CardContent className="p-0">
        <Box className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <Text as="h3" className="text-base font-bold">
            {title ?? "Permission matrix"}
          </Text>
          <Text as="p" className="text-xs text-muted-foreground">
            {hint ?? "Tick what each role may do. The list is what this build enforces."}
          </Text>
        </Box>

        <Box className="overflow-x-auto">
          <Box className="grid border-b bg-muted/30 px-6 py-3" style={grid}>
            <Text
              as="span"
              className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Permission
            </Text>
            {roles.map((role) => (
              <Text
                key={role.id}
                as="span"
                className="text-center text-[11px] font-bold uppercase tracking-widest text-navy"
              >
                {role.label}
              </Text>
            ))}
          </Box>

          {catalogue.map((permission, idx) => (
            <Box
              key={permission.id}
              className={cn(
                "grid items-center px-6 py-3 transition-colors hover:bg-muted/20",
                idx !== catalogue.length - 1 && "border-b",
              )}
              style={grid}
            >
              <Text as="span" className="text-sm font-medium">
                {permission.label}
              </Text>
              {roles.map((role) => (
                <Box key={role.id} className="flex items-center justify-center">
                  <Checkbox
                    checked={(draft[role.id] ?? new Set()).has(permission.id)}
                    onCheckedChange={() => onToggle(role.id, permission.id)}
                    className="h-5 w-5 rounded data-[state=checked]:border-navy/20 data-[state=checked]:bg-navy"
                  />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Add-role dialog. The key is derived from the name as it is typed, so nobody
 * has to think about an identifier; the server normalises it again anyway.
 */
export function AddRoleDialog({ open, onOpenChange, value, onChange, onSubmit, busy }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a role</DialogTitle>
        </DialogHeader>
        <Box className="space-y-4 py-2">
          <Box className="space-y-1.5">
            <Label className="text-sm font-medium">
              Name{" "}
              <Text as="span" className="text-error">
                *
              </Text>
            </Label>
            <Input
              placeholder="e.g. Trainer"
              value={value.label}
              onChange={(e) =>
                onChange({
                  ...value,
                  label: e.target.value,
                  key: e.target.value.trim().toLowerCase().replace(/\s+/g, "_"),
                })
              }
              className="h-10"
            />
            {value.key && (
              <Text as="p" className="text-[11px] text-muted-foreground">
                Identifier: {value.key}
              </Text>
            )}
          </Box>

          <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Box className="space-y-1.5">
              <Label className="text-sm font-medium">Lands in</Label>
              <Select
                value={value.portal}
                onValueChange={(v) => onChange({ ...value, portal: v })}
              >
                <SelectTrigger className="h-10 w-full text-sm">
                  <SelectValue>{portalLabel(value.portal)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PORTALS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
            <Box className="space-y-1.5">
              <Label className="text-sm font-medium">Can see</Label>
              <Select
                value={value.scope}
                onValueChange={(v) => onChange({ ...value, scope: v })}
              >
                <SelectTrigger className="h-10 w-full text-sm">
                  <SelectValue>{scopeLabel(value.scope)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          </Box>

          <Text as="p" className="text-[11px] text-muted-foreground">
            Add the role first, then tick its permissions in the matrix.
          </Text>
        </Box>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            className="bg-navy text-paper hover:bg-navy-soft"
            disabled={!value.label.trim() || busy}
            onClick={onSubmit}
          >
            {busy ? "Adding…" : "Add role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
