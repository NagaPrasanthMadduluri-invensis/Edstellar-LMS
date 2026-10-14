import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function CommunityLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Box className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </Box>
      <Box className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} className="rounded-lg border p-5 space-y-3">
            <Box className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Box className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </Box>
            </Box>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
