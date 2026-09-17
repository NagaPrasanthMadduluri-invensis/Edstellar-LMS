/**
 * Tenant commercial vocabulary — the browser's mirror of
 * `server/src/common/tenant-account.ts`, which is what validates it.
 *
 * `contract_state` is NOT computed here. The API derives it from the contract
 * date and sends it, so the directory, any future email and the overview all
 * read one answer. Recomputing it in the browser would be a second definition
 * of "expiring" that drifts the first time the warning window changes.
 */

export const PLANS = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

export const BILLING_CYCLES = ["monthly", "quarterly", "annual"];

/** How each derived contract state reads and colours. */
export const CONTRACT_STATE = {
  none:     { label: "No contract", text: "text-text-3", chip: "chip-idle"     },
  active:   { label: "Active",      text: "text-ink",    chip: "chip-complete" },
  expiring: { label: "Expiring",    text: "text-warning",chip: "chip-warning"  },
  expired:  { label: "Expired",     text: "text-danger", chip: "chip-error"    },
};

/**
 * Indian money, short form — ₹45.0 L, ₹1.20 Cr.
 *
 * Contract values here run to crores, and a bare 45000000 on a card is a
 * number nobody reads correctly at a glance. Full precision stays in the edit
 * dialog's number input, where it is being typed rather than scanned.
 */
export function formatMoney(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/** What an invoice's derived state reads and colours. */
export const INVOICE_STATE = {
  draft:     { label: "Draft",     chip: "chip-idle"     },
  issued:    { label: "Issued",    chip: "chip-progress" },
  part_paid: { label: "Part paid", chip: "chip-warning"  },
  paid:      { label: "Paid",      chip: "chip-complete" },
  overdue:   { label: "Overdue",   chip: "chip-error"    },
  void:      { label: "Void",      chip: "chip-idle"     },
};

export const PAYMENT_METHODS = ["bank_transfer", "cheque", "card", "other"];

export const SEAT_REQUEST_STATUS = {
  pending:  { label: "Pending",  chip: "chip-warning"  },
  approved: { label: "Approved", chip: "chip-complete" },
  declined: { label: "Declined", chip: "chip-error"    },
};
