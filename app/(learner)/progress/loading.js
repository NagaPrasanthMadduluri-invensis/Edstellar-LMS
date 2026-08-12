import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function ProgressLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Box className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <Box key={i} className="space-y-3">
            <Skeleton className="h-5 w-64" />
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </Box>
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
