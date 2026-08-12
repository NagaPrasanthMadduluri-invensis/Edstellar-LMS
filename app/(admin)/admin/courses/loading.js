import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function AdminCoursesLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Box className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </Box>
    </Box>
  );
}
