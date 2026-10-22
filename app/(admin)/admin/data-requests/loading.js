import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDataRequestsLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Box className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </Box>
      <Skeleton className="h-9 w-48" />
      <Box className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </Box>
    </Box>
  );
}
