import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function PlatformOrganizationDetailLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-20 rounded-xl" />
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </Box>
      <Skeleton className="h-64 rounded-xl" />
    </Box>
  );
}
