const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `    if (hasExternalDuplicateWarning) {
      exceptions.push({
        type: "Invoice Register Duplicate Warning",
        severity: "On Hold",
        reason: \`Duplicate warning flagged by the invoice extraction system (Extraction duplicate status: \$\{updatedLine.duplicateStatus\}).\`,
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        requiredAction: "Review historic transactions in ledger to ensure this invoice is not a duplicate."
      });
    }`,
  `    if (hasExternalDuplicateWarning) {
      if (!updatedLine.duplicateOf) {
        exceptions.push({
          type: "Invoice Register Duplicate Warning",
          severity: "On Hold",
          reason: "Duplicate reference missing—this invoice was flagged by the invoice-extraction stage, but the suspected comparison record was not provided.",
          suggestedFollowupParty: "Accounts Payable",
          followupStatus: "Pending Investigation",
          requiredAction: "Provide comparison record or verify manually."
        });
      } else {
        exceptions.push({
          type: "Invoice Register Duplicate Warning",
          severity: "On Hold",
          reason: \`Duplicate warning flagged by the invoice extraction system (Extraction duplicate status: \$\{updatedLine.duplicateStatus\}).\`,
          suggestedFollowupParty: "Accounts Payable",
          followupStatus: "Pending Investigation",
          requiredAction: "Review historic transactions in ledger to ensure this invoice is not a duplicate."
        });
      }
    }`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch engine 3");
