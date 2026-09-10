"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/providers/auth-provider";

/**
 * Why the user is looking at this form.
 *
 * `?session=expired` is set by every server-side redirect here when a cookie
 * was present but the API would not resolve it (see `middleware.js`). Saying
 * so matters: they did not click "sign out", they were bounced, and with no
 * reason given the form looks like it simply lost their password.
 *
 * Its own component, wrapped in Suspense by the caller, because
 * `useSearchParams()` opts a route out of static prerendering unless it sits
 * behind a boundary — and `/login` is SSG (TASTE §2.2). Reading the param
 * inside `LoginForm` failed the production build outright:
 * "useSearchParams() should be wrapped in a suspense boundary at page /login".
 */
function SessionExpiredNotice() {
  const params = useSearchParams();

  // Two different faults, and they must not wear the same message. Telling
  // someone their session ended when the server simply could not reach the
  // API points every subsequent minute of debugging at the wrong layer.
  if (params.get("error") === "unavailable") {
    return (
      <Box className="mb-4 rounded-lg border border-error/30 bg-error/10 px-3 py-2.5">
        <Text as="p" className="text-xs font-medium text-error">
          We couldn&rsquo;t reach the server to check your sign-in. Your account
          is fine — this is a problem on our side. Try again in a moment.
        </Text>
      </Box>
    );
  }

  if (params.get("session") === "expired") {
    return (
      <Box className="mb-4 rounded-lg border border-navy/20 bg-paper-cream px-3 py-2.5">
        <Text as="p" className="text-xs text-ink">
          Your session has ended — please sign in again. This also happens after
          your organization&rsquo;s roles or permissions change.
        </Text>
      </Box>
    );
  }

  return null;
}

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>
          <Text as="h1" className="text-2xl">Edstellar LMS</Text>
        </CardTitle>
        <Text as="p" className="text-muted-foreground text-sm">
          Sign in to your account
        </Text>
      </CardHeader>
      <CardContent>
        <Suspense fallback={null}>
          <SessionExpiredNotice />
        </Suspense>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Box className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {fieldErrors.email && (
              <Text as="p" className="text-xs text-error">{fieldErrors.email[0]}</Text>
            )}
          </Box>
          <Box className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {fieldErrors.password && (
              <Text as="p" className="text-xs text-error">{fieldErrors.password[0]}</Text>
            )}
          </Box>

          {error && !Object.keys(fieldErrors).length && (
            <Text as="p" className="text-sm text-error">{error}</Text>
          )}

          <Button
            type="submit"
            className="w-full bg-navy hover:bg-navy-soft text-paper"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {/* Self-registration was retired with multi-tenancy: a public signup
              form cannot know which organization a learner belongs to, and any
              default would place strangers inside a real customer's tenant.
              Accounts are created by an organization's admin. */}
          <Text as="p" className="text-sm text-center text-muted-foreground">
            Need an account? Ask your organization&apos;s administrator.
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
