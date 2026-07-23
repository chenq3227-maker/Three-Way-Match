const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  `  duplicateStatus: "Clear" | "Possible Duplicate" | "Exact Duplicate" | "Not Checked";`,
  `  duplicateStatus: "Clear" | "Possible Duplicate" | "Exact Duplicate" | "Not Checked";
  duplicateOf?: string;
  duplicateCheckSource?: "Same-Batch Duplicate" | "Historical Duplicate" | "Upstream Duplicate Warning";
  duplicateGroupId?: string;
  duplicateCandidateRecordId?: string;
  duplicateCandidateInvoiceNumber?: string;
  duplicateCandidateSourceFile?: string;
  duplicateReason?: string;
  duplicateReviewDecision?: "Confirmed Duplicate" | "Not a Duplicate" | "Pending Investigation";
  duplicateReviewNotes?: string;
  duplicateReviewerName?: string;
  duplicateIdentifiedOriginalId?: string;`
);

fs.writeFileSync('src/types.ts', code);
console.log("Done");
