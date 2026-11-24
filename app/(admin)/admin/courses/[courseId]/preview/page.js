import { CourseDetailContent } from "@/components/learner/course-detail-content";

export default async function AdminCoursePreviewPage({ params }) {
  const { courseId } = await params;

  return <CourseDetailContent courseId={courseId} preview />;
}
