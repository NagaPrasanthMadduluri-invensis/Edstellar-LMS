import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function PlatformDashboardLoading() {
  return (
    <Box className="space-y-5">
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Skeleton className="h-96 rounded-xl" />
    </Box>
  );
}
