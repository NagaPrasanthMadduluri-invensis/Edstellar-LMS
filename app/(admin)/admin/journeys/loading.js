import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLearningPathsLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-[86px] w-full" />
      <Skeleton className="h-10 w-full" />
      <Box className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[190px] w-full" />)}
      </Box>
    </Box>
  );
}
