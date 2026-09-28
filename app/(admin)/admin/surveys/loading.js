import Box from "@/components/ui/box";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSurveysLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-16 w-80" />
      <Skeleton className="h-10 w-full" />
      <Box className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </Box>
    </Box>
  );
}
