import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function PlatformOrganizationsLoading() {
  return (
    <Box className="space-y-5">
      <Box className="flex items-center justify-between">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </Box>
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}
