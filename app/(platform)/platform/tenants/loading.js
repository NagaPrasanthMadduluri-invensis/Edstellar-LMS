import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformTenantsLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-[74px] w-full" />
      <Skeleton className="h-10 w-full" />
      <Box className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[190px] w-full" />)}
      </Box>
    </Box>
  );
}
