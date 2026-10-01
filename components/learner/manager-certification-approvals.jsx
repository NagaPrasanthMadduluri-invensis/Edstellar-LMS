"use client";

import { CertificationApprovals } from "@/components/shared/certification-approvals";
import {
  decideAsManager,
  fetchManagerCertificationQueue,
} from "@/services/api/external-certifications-api";

/**
 * The manager's step, on Team Learning where a manager already works.
 *
 * The question at this step is narrow and the wording says so: did this
 * person actually complete it? Nothing is created by a yes — L&D still has
 * the final call — and the dialog states that, because "Approve" without
 * it reads as the decision rather than the first of two.
 */
export function ManagerCertificationApprovals() {
  return (
    <CertificationApprovals
      title="External certifications to confirm"
      blurb="Your reports have asked for training they did elsewhere to be counted. Confirm they completed it; your L&D team gives the final approval."
      emptyText="Nothing waiting on you."
      approveLabel="Confirm"
      approveConsequence="This passes it to your L&D team for final approval. Nothing is added to their record yet."
      fetchQueue={fetchManagerCertificationQueue}
      decide={decideAsManager}
    />
  );
}
