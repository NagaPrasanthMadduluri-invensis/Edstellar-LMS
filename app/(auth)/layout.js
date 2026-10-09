import Box from "@/components/ui/box";

export default function AuthLayout({ children }) {
  return (
    <Box className="flex min-h-full items-center justify-center p-4">
      {children}
    </Box>
  );
}
