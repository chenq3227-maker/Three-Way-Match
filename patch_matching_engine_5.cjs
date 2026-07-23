const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `  const duplicateGroupIds = new Map<string, string>(); // recordId -> groupId
  const duplicateCandidates = new Map<string, any>(); // recordId -> candidate info
  for (let i = 0; i < invoices.length; i++) {`,
  `  const duplicateGroupIds = new Map<string, string>(); // recordId -> groupId
  const duplicateCandidates = new Map<string, any>(); // recordId -> candidate info
  const historicalDuplicates = new Set<string>(); // recordId -> true
  
  for (let i = 0; i < invoices.length; i++) {
    // Check against historical first
    const a = invoices[i];
    for (const h of historicalInvoices) {
      const sameInvoiceNumber = a.invoiceNumber === h.invoiceNumber;
      if (sameInvoiceNumber) {
        historicalDuplicates.add(a.recordId);
        duplicateCandidates.set(a.recordId, h);
        break; // found one
      }
    }

    // Now internal checking`
);

code = code.replace(
  `    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);
    if (isInternalDuplicate) {`,
  `    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);
    const isHistoricalDuplicate = historicalDuplicates.has(updatedLine.recordId);
    
    if (isHistoricalDuplicate && !isInternalDuplicate) {
      updatedLine.duplicateCheckSource = "Historical Duplicate";
      const cand = duplicateCandidates.get(updatedLine.recordId);
      if (cand) {
        updatedLine.duplicateCandidateRecordId = cand.recordId;
        updatedLine.duplicateCandidateInvoiceNumber = cand.invoiceNumber;
        updatedLine.duplicateCandidateSourceFile = cand.sourceFileName || "Historical Register";
      }
      updatedLine.duplicateReason = "Invoice number matches a record in the historical register.";
    } else if (isInternalDuplicate) {`
);

code = code.replace(
  `    // Check same-batch internal duplicates separately
    if (isInternalDuplicate) {
      exceptions.push({
        type: "Batch Duplicate Warning",
        severity: "On Hold",
        reason: \`Identified another invoice in this batch with identical supplier, PO, date, item, quantity, and amount but a different invoice number. Potential duplicate pair.\`,
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        requiredAction: "Verify if this invoice has already been registered or is a double entry."
      });
    }`,
  `    // Check same-batch internal duplicates separately
    if (isInternalDuplicate) {
      exceptions.push({
        type: "Batch Duplicate Warning",
        severity: "On Hold",
        reason: "Identified a potential duplicate invoice within the current batch (either exact matching details or same invoice number).",
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        requiredAction: "Verify if this invoice is a double entry."
      });
    } else if (isHistoricalDuplicate) {
      exceptions.push({
        type: "Historical Duplicate Warning",
        severity: "On Hold",
        reason: "Invoice number already exists in the historical invoice register.",
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        requiredAction: "Verify if this invoice has already been processed previously."
      });
    }`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch matching engine 5");
