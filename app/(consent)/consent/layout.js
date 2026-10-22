import Box from "@/components/ui/box";

export default function ConsentLayout({ children }) {
  return (
    <Box className="flex min-h-screen items-center justify-center p-4">
      {children}
    </Box>
  );
}
