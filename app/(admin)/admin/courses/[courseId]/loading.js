import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function AdminCourseModulesLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Box className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-28" />
      </Box>
      <Box className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </Box>
    </Box>
  );
}
