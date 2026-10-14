import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function AdminReferralsLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Box className="flex justify-end">
        <Skeleton className="h-9 w-36" />
      </Box>
      <Box className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </Box>
    </Box>
  );
}
