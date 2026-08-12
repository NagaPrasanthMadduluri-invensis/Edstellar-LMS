import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function Loading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48 rounded" />
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </Box>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </Box>
  );
}
