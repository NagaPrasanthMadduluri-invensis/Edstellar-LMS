import Box from "@/components/ui/box";
import { PageHeader } from "@/components/shared/page-header";
import { CourseCatalogueContent } from "@/components/learner/course-catalogue-content";

export default function CataloguePage() {
  return (
    <Box className="space-y-6">
      <PageHeader
        eyebrow="My Learning"
        title="Course"
        emphasis="catalogue"
        summary="Courses and live sessions your organization has opened to everyone. Add one and it moves straight into My Courses or My Sessions, and its hours count like any other training."
      />
      <CourseCatalogueContent />
    </Box>
  );
}
