import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function CertificationsLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-36 rounded-2xl w-full" />
      <Skeleton className="h-[420px] rounded-2xl w-full" />
    </Box>
  );
}
