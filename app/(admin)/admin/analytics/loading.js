import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-9 w-[420px] max-w-full" />
      <Skeleton className="h-[130px] w-full" />
      <Skeleton className="h-[320px] w-full" />
      <Box className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </Box>
    </Box>
  );
}
