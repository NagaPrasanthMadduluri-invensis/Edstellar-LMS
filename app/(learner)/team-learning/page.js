import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { TeamLearningContent } from "@/components/learner/team-learning-content";
import { ManagerCertificationApprovals } from "@/components/learner/manager-certification-approvals";

export default function TeamLearningPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My team"
        title="Team"
        emphasis="learning"
        summary="How your direct reports are progressing."
      />
      {/* Above the team table for the same reason the admin queue is above
          the certificate list: it is the part that is waiting on this
          person, and it renders nothing when there is nothing waiting. */}
      <ManagerCertificationApprovals />
      <TeamLearningContent />
    </Box>
  );
}
