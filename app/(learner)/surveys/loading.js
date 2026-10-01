import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-6">
      <Box className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72" />
      </Box>
      {[...Array(3)].map((_, i) => (
        <Box key={i} className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-16 w-full" />
        </Box>
      ))}
    </Box>
  );
}
