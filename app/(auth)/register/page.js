"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/providers/auth-provider";

const DEPARTMENTS = [
  "Sales",
  "HR",
  "Technology",
  "Finance",
  "Marketing",
  "Operations",
  "Legal",
  "Customer Support",
  "Product",
  "Design",
];

function RegisterForm() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    password: "",
    passwordConfirmation: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (form.password !== form.passwordConfirmation) {
      setFieldErrors({ passwordConfirmation: ["Passwords do not match"] });
      return;
    }

    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      if (err.errors) setFieldErrors(err.errors);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>
          <Text as="h1" className="text-2xl">Create Account</Text>
        </CardTitle>
        <Text as="p" className="text-muted-foreground text-sm">
          Register for Edstellar LMS
        </Text>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Box className="grid grid-cols-2 gap-3">
            <Box className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={update("firstName")}
                required
              />
              {fieldErrors.first_name && (
                <Text as="p" className="text-xs text-red-600">{fieldErrors.first_name[0]}</Text>
              )}
            </Box>
            <Box className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={update("lastName")}
                required
              />
              {fieldErrors.last_name && (
                <Text as="p" className="text-xs text-red-600">{fieldErrors.last_name[0]}</Text>
              )}
            </Box>
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              required
            />
            {fieldErrors.email && (
              <Text as="p" className="text-xs text-red-600">{fieldErrors.email[0]}</Text>
            )}
          </Box>

          <Box className="space-y-2">
            <Label>Department</Label>
            <Select
              value={form.department}
              onValueChange={(val) => setForm((prev) => ({ ...prev, department: val }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.department && (
              <Text as="p" className="text-xs text-red-600">{fieldErrors.department[0]}</Text>
            )}
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={update("password")}
              required
            />
            {fieldErrors.password && (
              <Text as="p" className="text-xs text-red-600">{fieldErrors.password[0]}</Text>
            )}
          </Box>

          <Box className="space-y-2">
            <Label htmlFor="passwordConfirmation">Confirm Password</Label>
            <Input
              id="passwordConfirmation"
              type="password"
              placeholder="Repeat password"
              value={form.passwordConfirmation}
              onChange={update("passwordConfirmation")}
              required
            />
            {fieldErrors.passwordConfirmation && (
              <Text as="p" className="text-xs text-red-600">{fieldErrors.passwordConfirmation[0]}</Text>
            )}
          </Box>

          {error && !Object.keys(fieldErrors).length && (
            <Text as="p" className="text-sm text-red-600">{error}</Text>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Register"}
          </Button>

          <Text as="p" className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-500 font-medium hover:underline">
              Sign In
            </Link>
          </Text>
        </form>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterForm />
    </AuthProvider>
  );
}
