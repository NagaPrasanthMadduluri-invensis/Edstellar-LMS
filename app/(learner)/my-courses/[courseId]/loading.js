import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function CourseDetailLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Box className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </Box>
      <Skeleton className="h-64 w-full rounded-lg" />
    </Box>
  );
}
