import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function UsersLoading() {
  return (
    <Box className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </Box>
  );
}
