import Box from "@/components/ui/box";

/**
 * A plain, public document shell — no portal sidebar, no auth. Top-aligned and
 * scrollable, because a policy is read top to bottom, not centred like the
 * login card. Used by `/privacy`.
 */
export default function LegalLayout({ children }) {
  return (
    <Box className="min-h-screen overflow-y-auto bg-canvas px-4 py-10">
      <Box className="mx-auto w-full max-w-3xl">{children}</Box>
    </Box>
  );
}
