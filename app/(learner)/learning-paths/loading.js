import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-6">
      <Box className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72" />
      </Box>
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-[30rem]" />)}
      </Box>
    </Box>
  );
}
