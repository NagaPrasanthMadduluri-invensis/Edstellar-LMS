import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function AdminCertificatesLoading() {
  return (
    <Box className="space-y-5">
      <Box className="space-y-2">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </Box>
      <Skeleton className="h-16 rounded-2xl w-full" />
      <Box className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg w-full" />)}
      </Box>
    </Box>
  );
}
