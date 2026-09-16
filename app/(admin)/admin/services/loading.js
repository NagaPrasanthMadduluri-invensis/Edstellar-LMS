import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminServicesLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-[74px] w-full" />
      <Skeleton className="h-10 w-full" />
      <Box className="grid gap-2 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </Box>
    </Box>
  );
}
