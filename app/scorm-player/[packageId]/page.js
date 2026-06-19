import { ScormPlayerClient } from "@/components/scorm/scorm-player-client";

export default async function ScormPlayerPage({ params }) {
  const { packageId } = await params;
  return <ScormPlayerClient packageId={packageId} />;
}
