const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `export function runThreeWayMatch(
  invoices: InvoiceLine[],
  poLines: POLine[],
  grnLines: GRNLine[],
  summaryMappings?: ColumnMapping[],
  granularMappings?: ColumnMapping[]
): InvoiceLine[] {`,
  `export function runThreeWayMatch(
  invoices: InvoiceLine[],
  poLines: POLine[],
  grnLines: GRNLine[],
  summaryMappings?: ColumnMapping[],
  granularMappings?: ColumnMapping[],
  historicalInvoices: InvoiceLine[] = []
): InvoiceLine[] {`
);

code = code.replace(
  `      if (!updatedLine.duplicateOf) {
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
      }`,
  `      if (!updatedLine.duplicateOf) {
        updatedLine.duplicateReason = "Duplicate reference missing—this invoice was flagged by the invoice-extraction stage, but the suspected comparison record was not provided.";
      } else {
        // Find if the duplicateOf is in the batch
        const cand = invoices.find(inv => inv.invoiceNumber === updatedLine.duplicateOf && inv.recordId !== updatedLine.recordId);
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
           const histCand = historicalInvoices.find(inv => inv.invoiceNumber === updatedLine.duplicateOf);
           if (histCand) {
             updatedLine.duplicateCheckSource = "Historical Duplicate";
             updatedLine.duplicateCandidateRecordId = histCand.recordId;
             updatedLine.duplicateCandidateInvoiceNumber = histCand.invoiceNumber;
             updatedLine.duplicateCandidateSourceFile = histCand.sourceFileName;
           } else {
             updatedLine.duplicateCheckSource = "Historical Duplicate";
             updatedLine.duplicateCandidateInvoiceNumber = updatedLine.duplicateOf;
             if (historicalInvoices.length === 0) {
               updatedLine.duplicateReason = "Historical duplicate checking was not performed (no historical data uploaded). Reference provided: " + updatedLine.duplicateOf;
             } else {
               updatedLine.duplicateReason = "Could not locate historical record for reference " + updatedLine.duplicateOf;
             }
           }
        }
      }`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch matching historical");
