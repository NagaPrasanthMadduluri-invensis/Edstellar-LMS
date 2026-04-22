import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function AssessmentLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-28 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </Box>
  );
}
