import { Skeleton } from "@/components/ui/skeleton";
import Box from "@/components/ui/box";

export default function MessagesLoading() {
  return (
    <Box className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Box className="grid gap-0 overflow-hidden rounded-xl border border-line md:grid-cols-[300px_1fr]">
        <Box className="space-y-3 border-line p-4 md:border-r">
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Box className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-40" />
              </Box>
            </Box>
          ))}
        </Box>
        <Box className="hidden min-h-[420px] p-6 md:block">
          <Skeleton className="h-full w-full rounded-lg" />
        </Box>
      </Box>
    </Box>
  );
}
