import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityLog } from "@/components/shared/activity-log";

export default function PlatformActivityPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Platform · Activity log"
        title="Every action,"
        emphasis="every tenant"
        summary="Including what each organization's own admins did — and anything Edstellar did inside their account."
      />
      {/*
        `showOrganization` is the ONLY difference from the tenant view. The
        scope itself is decided by which controller answered, never by this
        prop — passing it on the admin route would add a column with one
        value in it, not widen anybody's reach.
      */}
      <ActivityLog base="platform" showOrganization />
    </Box>
  );
}
