import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function CertificationsLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-36 rounded-2xl w-full" />
      <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <Box key={i} className="flex flex-col overflow-hidden rounded-xl border">
            <Skeleton className="h-32 rounded-none" />
            <Box className="p-5 space-y-3">
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-md" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
