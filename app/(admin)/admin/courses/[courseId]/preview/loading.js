import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCoursePreviewLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </Box>
  );
}
