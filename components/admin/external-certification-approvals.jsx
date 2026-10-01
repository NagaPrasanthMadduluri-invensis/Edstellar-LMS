"use client";

import { CertificationApprovals } from "@/components/shared/certification-approvals";
import {
  decideAsAdmin,
  fetchAdminCertificationQueue,
} from "@/services/api/external-certifications-api";

/**
 * L&D's step: the final decision, and the only one that creates anything.
 *
 * The queue asks the API for `pending_admin` only. A claim still with a
 * manager is deliberately NOT offered here — the API refuses it with a
 * sentence naming who has it, and listing rows an admin cannot act on would
 * be the screen-that-lies failure with a button attached (§10.3.1.2).
 *
 * The consequence is spelled out before the click because it is
 * irreversible in practice: approving writes a completed course onto
 * somebody's record and moves their learning hours.
 */
export function ExternalCertificationApprovals() {
  return (
    <CertificationApprovals
      title="External certifications awaiting approval"
      blurb="Training a learner completed elsewhere, already confirmed by their manager — or sent straight here because they have none."
      emptyText="Nothing waiting for approval."
      approveLabel="Approve"
      approveConsequence="Approving adds this to their My Courses as completed externally and puts its hours into their learning total. It counts as a completed course in your reports."
      fetchQueue={() => fetchAdminCertificationQueue({ status: "pending_admin" })}
      decide={decideAsAdmin}
    />
  );
}
