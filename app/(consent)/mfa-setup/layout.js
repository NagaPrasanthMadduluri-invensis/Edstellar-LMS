import Box from "@/components/ui/box";

/** Centred like the consent page: one card, nothing else on the screen. */
export default function MfaSetupLayout({ children }) {
  return (
    <Box className="flex min-h-screen items-center justify-center p-4">
      {children}
    </Box>
  );
}
