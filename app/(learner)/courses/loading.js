import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function CoursesLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Box className="flex gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-48" />
      </Box>
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-lg" />
        ))}
      </Box>
    </Box>
  );
}
