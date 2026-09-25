import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-6">
      <Box className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72" />
      </Box>
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-[30rem] w-full" />
    </Box>
  );
}
