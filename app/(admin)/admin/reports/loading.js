import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function Loading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-56 rounded" />
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </Box>
    </Box>
  );
}
