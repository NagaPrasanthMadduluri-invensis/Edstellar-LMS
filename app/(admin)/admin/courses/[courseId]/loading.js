import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCourseDetailLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-[110px] w-full" />
      <Skeleton className="h-11 w-full" />
      <Box className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </Box>
    </Box>
  );
}
