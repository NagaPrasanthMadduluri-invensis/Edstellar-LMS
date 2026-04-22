import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function Loading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-8 w-52 rounded" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </Box>
  );
}
