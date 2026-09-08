import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-6">
      <Box className="space-y-2">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-9 w-64 rounded" />
      </Box>
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </Box>
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </Box>
  );
}
