import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-6">
      <Box className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72" />
      </Box>
      <Box className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </Box>
      <Skeleton className="h-64 w-full" />
    </Box>
  );
}
