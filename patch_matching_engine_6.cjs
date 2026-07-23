const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `    if (isInternalDuplicate) {
      exceptions.push({
        type: "Batch Duplicate Warning",`,
  `    if (isInternalDuplicate && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {
      exceptions.push({
        type: "Batch Duplicate Warning",`
);

code = code.replace(
  `    } else if (isHistoricalDuplicate) {
      exceptions.push({
        type: "Historical Duplicate Warning",`,
  `    } else if (isHistoricalDuplicate && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {
      exceptions.push({
        type: "Historical Duplicate Warning",`
);

code = code.replace(
  `    if (hasExternalDuplicateWarning) {
      if (!updatedLine.duplicateOf) {`,
  `    if (hasExternalDuplicateWarning && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {
      if (!updatedLine.duplicateOf) {`
);

// We should also check for Confirmed Duplicate
code = code.replace(
  `    if (isInternalDuplicate && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {`,
  `    const isConfirmedDuplicate = updatedLine.duplicateReviewDecision === "Confirmed Duplicate";
    
    if (isConfirmedDuplicate) {
      exceptions.push({
        type: "Confirmed Duplicate",
        severity: "On Hold",
        reason: \`Manually confirmed as a duplicate by \$\{updatedLine.duplicateReviewerName\}. Original Record ID: \$\{updatedLine.duplicateIdentifiedOriginalId || 'Unknown'\}\`,
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Keep on Hold",
        requiredAction: "Do not process this invoice."
      });
    } else if (isInternalDuplicate && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch matching engine 6");
