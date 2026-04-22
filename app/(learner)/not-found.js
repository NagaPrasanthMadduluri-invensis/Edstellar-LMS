import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import Box from "@/components/ui/box";
import Link from "next/link";

export default function LearnerNotFound() {
  return (
    <Box className="flex flex-1 flex-col items-center justify-center h-full min-h-[calc(100vh-3.5rem)]">
      <Text as="h1" className="text-6xl font-extrabold text-muted-foreground/30">404</Text>
      <Text as="h2" className="text-xl mt-2">Page Not Found</Text>
      <Text as="p" className="text-sm text-muted-foreground mt-1">
        The page you are looking for does not exist.
      </Text>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </Box>
  );
}
