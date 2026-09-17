import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { LearningPaths } from "@/components/admin/learning-paths";

/**
 * The route stays `/admin/journeys` while the LABEL becomes "Learning paths".
 *
 * Renaming the URL would break every bookmark and every link already sent, and
 * the API's own resource is `journeys` — a path whose page said `/paths` and
 * whose endpoints said `/journeys` would be one more thing to translate when
 * reading a network tab. The vocabulary change is real; the identifier is not.
 */
export default function AdminLearningPathsPage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="Admin · Course management"
        title="Learning"
        emphasis="paths"
        summary="An ordered run of existing courses with a badge at the end. Build one, order its steps, then assign it."
      />
      <LearningPaths />
    </Box>
  );
}
