/** Shared label formatting for enum values shown in the UI. */

export const employmentTypeLabel: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
  INTERNSHIP: "Internship",
};

export const remoteTypeLabel: Record<string, string> = {
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const experienceLevelLabel: Record<string, string> = {
  ENTRY: "Entry level",
  MID: "Mid level",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

export const jobStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const applicationStatusLabel: Record<string, string> = {
  NEW: "New",
  SCREENING: "Screening",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

export const invoiceStatusLabel: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", PARTIALLY_PAID: "Partially paid",
  PAID: "Paid", OVERDUE: "Overdue", VOID: "Void",
};

export const offerStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};

/**
 * Human labels for offer lifecycle audit events. The generic fallback
 * ("OFFER_LINK_OPENED" -> "link opened") reads poorly for the signing
 * events, which are the ones a reviewer most needs to understand.
 */
export const offerEventLabel: Record<string, string> = {
  OFFER_CREATED: "Offer created",
  OFFER_UPDATED: "Offer updated",
  OFFER_SUBMITTED_FOR_APPROVAL: "Submitted for approval",
  OFFER_APPROVED: "Approved",
  OFFER_REJECTED: "Rejected",
  OFFER_PDF_GENERATED: "Offer PDF generated",
  OFFER_SENT: "Sent to candidate",
  OFFER_LINK_OPENED: "Candidate opened the offer link",
  IDENTITY_VERIFICATION_SENT: "Verification code sent",
  IDENTITY_VERIFIED: "Identity verified",
  OFFER_VIEWED: "Offer viewed",
  ESIGN_CONSENT_ACCEPTED: "Consented to electronic signature",
  OFFER_SIGNED: "Signed by candidate",
  OFFER_ACCEPTED: "Offer accepted",
  SIGNED_PDF_GENERATED: "Signed PDF generated",
  OFFER_DECLINED: "Declined by candidate",
  OFFER_WITHDRAWN: "Withdrawn",
  OFFER_EXPIRED: "Expired",
  OFFER_EXTENDED: "Expiration extended",
  OFFER_EMAIL_FAILED: "Offer email failed to send",
};

/** "2 hours ago", "yesterday", "3 days ago" — for dashboard density. */
export function relativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Compact date for dense tables: "Sep 10, 2026". */
export function shortDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Cents -> "$145,000". Offer compensation is stored as integer cents. */
export function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
