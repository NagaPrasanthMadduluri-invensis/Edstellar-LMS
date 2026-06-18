"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, X, KeyRound, ShieldCheck } from "lucide-react";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";

const RULES = [
  { key: "minLength", label: "At least 8 characters",          check: (p) => p.length >= 8              },
  { key: "uppercase", label: "At least one uppercase letter",   check: (p) => /[A-Z]/.test(p)            },
  { key: "number",    label: "At least one number",             check: (p) => /[0-9]/.test(p)            },
  { key: "special",   label: "At least one special character",  check: (p) => /[^A-Za-z0-9]/.test(p)    },
];

function strengthScore(password) {
  if (!password) return 0;
  return RULES.filter((r) => r.check(password)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "bg-red-500", "bg-orange-400", "bg-amber-400", "bg-emerald-500"];
const STRENGTH_TEXT   = ["", "text-red-600", "text-orange-500", "text-amber-500", "text-emerald-600"];

function PasswordInput({ id, value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <Box className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
        autoComplete="new-password"
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </Box>
  );
}

export function ChangePasswordContent() {
  const { token } = useAuth();

  const [current, setCurrent]     = useState("");
  const [next, setNext]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const score       = strengthScore(next);
  const allRulesMet = score === RULES.length;
  const matches     = next && confirm && next === confirm;
  const canSubmit   = current && allRulesMet && matches && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!canSubmit) return;

    setLoading(true);
    try {
      await apiClient("/api/learner/change-password", {
        method: "POST",
        token,
        body: { currentPassword: current, newPassword: next },
      });
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto p-8 flex flex-col items-center gap-4 text-center">
        <Box className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-emerald-500" />
        </Box>
        <Box>
          <Text as="h2" className="text-lg font-bold">Password Changed</Text>
          <Text as="p" className="text-sm text-muted-foreground mt-1">
            Your password has been updated successfully. Use your new password the next time you log in.
          </Text>
        </Box>
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => setSuccess(false)}
        >
          Change Again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto p-6 space-y-6">

      {/* Header */}
      <Box className="flex items-center gap-3">
        <Box className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <KeyRound className="h-5 w-5 text-indigo-500" />
        </Box>
        <Box>
          <Text as="h2" className="text-base font-bold">Change Password</Text>
          <Text as="p" className="text-xs text-muted-foreground mt-0.5">
            Create a strong password to keep your account secure.
          </Text>
        </Box>
      </Box>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Current password */}
        <Box className="space-y-1.5">
          <Label htmlFor="current">Current Password</Label>
          <PasswordInput
            id="current"
            value={current}
            onChange={setCurrent}
            placeholder="Enter your current password"
            disabled={loading}
          />
          {fieldErrors.current && (
            <Text as="p" className="text-xs text-red-600">{fieldErrors.current}</Text>
          )}
        </Box>

        {/* New password + strength meter */}
        <Box className="space-y-1.5">
          <Label htmlFor="new">New Password</Label>
          <PasswordInput
            id="new"
            value={next}
            onChange={setNext}
            placeholder="Create a strong new password"
            disabled={loading}
          />

          {/* Strength bar */}
          {next.length > 0 && (
            <Box className="space-y-2 pt-1">
              <Box className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all duration-300",
                      i <= score ? STRENGTH_COLORS[score] : "bg-muted"
                    )}
                  />
                ))}
              </Box>
              <Box className="flex items-center justify-between">
                <Text as="span" className={cn("text-[11px] font-semibold", STRENGTH_TEXT[score])}>
                  {STRENGTH_LABELS[score]}
                </Text>
                <Text as="span" className="text-[11px] text-muted-foreground">
                  {score}/{RULES.length} requirements met
                </Text>
              </Box>
            </Box>
          )}

          {/* Rules checklist */}
          <Box className="space-y-1 pt-1">
            {RULES.map((rule) => {
              const met = next.length > 0 && rule.check(next);
              const unmet = next.length > 0 && !rule.check(next);
              return (
                <Box key={rule.key} className="flex items-center gap-2">
                  <Box className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    met   ? "bg-emerald-500" :
                    unmet ? "bg-red-100"     : "bg-muted"
                  )}>
                    {met   && <Check className="h-2.5 w-2.5 text-white" />}
                    {unmet && <X     className="h-2.5 w-2.5 text-red-500" />}
                  </Box>
                  <Text as="span" className={cn(
                    "text-xs",
                    met   ? "text-emerald-600 font-medium" :
                    unmet ? "text-red-500"                  : "text-muted-foreground"
                  )}>
                    {rule.label}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Confirm new password */}
        <Box className="space-y-1.5">
          <Label htmlFor="confirm">Confirm New Password</Label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter your new password"
            disabled={loading}
          />
          {confirm.length > 0 && (
            <Box className="flex items-center gap-1.5 pt-0.5">
              {matches ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <Text as="span" className="text-xs text-emerald-600 font-medium">Passwords match</Text>
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5 text-red-500" />
                  <Text as="span" className="text-xs text-red-500">Passwords do not match</Text>
                </>
              )}
            </Box>
          )}
        </Box>

        {/* Global error */}
        {error && (
          <Box className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <Text as="p" className="text-sm text-red-700">{error}</Text>
          </Box>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit}
        >
          {loading ? "Updating…" : "Update Password"}
        </Button>

      </form>
    </Card>
  );
}
