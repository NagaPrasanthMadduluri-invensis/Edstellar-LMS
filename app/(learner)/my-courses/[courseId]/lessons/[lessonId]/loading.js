import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function LessonLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="aspect-video w-full rounded-lg" />
    </Box>
  );
}
