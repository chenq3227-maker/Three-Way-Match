const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);`,
  `    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);
    if (isInternalDuplicate) {
      updatedLine.duplicateGroupId = duplicateGroupIds.get(updatedLine.recordId);
      updatedLine.duplicateCheckSource = "Same-Batch Duplicate";
      const cand = duplicateCandidates.get(updatedLine.recordId);
      if (cand) {
        updatedLine.duplicateCandidateRecordId = cand.recordId;
        updatedLine.duplicateCandidateInvoiceNumber = cand.invoiceNumber;
        updatedLine.duplicateCandidateSourceFile = cand.sourceFileName;
      }
      updatedLine.duplicateReason = "Supplier, PO, date, item, quantity, and amount match another invoice in the batch.";
    } else if (hasExternalDuplicateWarning) {
      updatedLine.duplicateCheckSource = "Upstream Duplicate Warning";
      updatedLine.duplicateReason = "Flagged by invoice extraction system.";
      
      if (!updatedLine.duplicateOf) {
        updatedLine.duplicateReason = "Duplicate reference missing—this invoice was flagged by the invoice-extraction stage, but the suspected comparison record was not provided.";
      } else {
        // Find if the duplicateOf is in the batch
        const cand = invoices.find(inv => inv.invoiceNumber === updatedLine.duplicateOf);
        if (cand) {
           let groupId = duplicateGroupIds.get(cand.recordId) || duplicateGroupIds.get(updatedLine.recordId);
           if (!groupId) {
             groupId = \`GRP-\$\{nextGroupId++\}\`;
           }
           updatedLine.duplicateGroupId = groupId;
           updatedLine.duplicateCandidateRecordId = cand.recordId;
           updatedLine.duplicateCandidateInvoiceNumber = cand.invoiceNumber;
           updatedLine.duplicateCandidateSourceFile = cand.sourceFileName;
           duplicateGroupIds.set(cand.recordId, groupId);
           duplicateGroupIds.set(updatedLine.recordId, groupId);
        } else {
           updatedLine.duplicateCheckSource = "Historical Duplicate";
           updatedLine.duplicateCandidateInvoiceNumber = updatedLine.duplicateOf;
        }
      }
    }`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch engine 2");
