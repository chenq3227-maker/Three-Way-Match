import { InvoiceLine } from "../types";

export function getLineFinalStatus(line: InvoiceLine): "Matched – Awaiting Human Sign-off" | "Review Required" | "On Hold" | "Resolved – Ready for Payment Authorisation" {
  // Check standard human review sign-off
  const hr = line.humanReview;
  const isStandardResolved = !!(
    hr &&
    hr.reviewerName && hr.reviewerName.trim() !== "" &&
    hr.notes && hr.notes.trim() !== "" &&
    hr.timestamp && hr.timestamp.trim() !== "" &&
    hr.reviewDecision === "Resolved – Send for Department Approval"
  );

  // Check duplicate review sign-off
  const hasDuplicateException = line.exceptions?.some(e => e.type.includes("Duplicate Warning"));
  const isDuplicateResolved = !!(
    hasDuplicateException &&
    line.duplicateReviewerName && line.duplicateReviewerName.trim() !== "" &&
    line.duplicateReviewNotes && line.duplicateReviewNotes.trim() !== "" &&
    line.duplicateReviewDecision === "Not a Duplicate"
  );

  if (isStandardResolved || isDuplicateResolved) {
    return "Resolved – Ready for Payment Authorisation";
  }

  // Fallback to base statuses
  if (line.overallStatus === "On Hold") {
    return "On Hold";
  } else if (line.overallStatus === "Review Required") {
    return "Review Required";
  } else {
    return "Matched – Awaiting Human Sign-off";
  }
}
