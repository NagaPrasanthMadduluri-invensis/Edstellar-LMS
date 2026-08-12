import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function AssessmentsLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Box className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </Box>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </Box>
  );
}
