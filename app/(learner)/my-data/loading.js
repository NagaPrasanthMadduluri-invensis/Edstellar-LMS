import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-6">
      <Box className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72" />
      </Box>
      <Skeleton className="h-28 w-full rounded-lg" />
      <Box className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </Box>
      <Skeleton className="h-40 w-full rounded-lg" />
    </Box>
  );
}
