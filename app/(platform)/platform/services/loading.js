import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformServicesLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-[74px] w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-[320px] w-full" />
    </Box>
  );
}
