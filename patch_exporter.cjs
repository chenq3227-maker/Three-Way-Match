const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

code = code.replace(
  `    "GRN Condition Check",
    "Document Verification Check",`,
  `    "GRN Condition Check",
    "Document Verification Check",
    "Duplicate Candidate ID",
    "Duplicate Candidate Invoice No",
    "Duplicate Check Source",
    "Duplicate Reason",
    "Duplicate Review Decision",`
);

// Now in the "Fill Match Results" section
code = code.replace(
  `      // Formatting checks`,
  `      // Duplicate fields
      const dupCandidateId = line.duplicateCandidateRecordId || "";
      const dupCandidateInv = line.duplicateCandidateInvoiceNumber || "";
      const dupCheckSource = line.duplicateCheckSource || "";
      const dupReason = line.duplicateReason || "";
      const dupDecision = line.duplicateReviewDecision || "";
      
      // Formatting checks`
);

code = code.replace(
  `      const duplicateCheck = (line.duplicateStatus === "Possible Duplicate" || line.duplicateStatus === "Exact Duplicate") 
        ? "Warning" 
        : "Clear";`,
  `      const duplicateCheck = (line.duplicateStatus === "Possible Duplicate" || line.duplicateStatus === "Exact Duplicate") 
        ? "Warning" 
        : "Clear";`
); // no change actually needed here

code = code.replace(
  `      duplicateCheck,
      grnConditionCheck,
      docVerificationCheck,
      invPoQtyDiff,`,
  `      duplicateCheck,
      grnConditionCheck,
      docVerificationCheck,
      dupCandidateId,
      dupCandidateInv,
      dupCheckSource,
      dupReason,
      dupDecision,
      invPoQtyDiff,`
);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done patch exporter");
