import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function Loading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48 rounded" />
      <Box className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </Box>
    </Box>
  );
}
