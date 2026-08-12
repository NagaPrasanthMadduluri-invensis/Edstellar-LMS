import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function MyCoursesLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} className="rounded-lg border overflow-hidden">
            <Skeleton className="h-32 w-full" />
            <Box className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-8 w-full" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
