const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

// Find the duplicate pairing loop
code = code.replace(
  `  const duplicatePairs = new Set<string>(); // Keep record IDs of suspected duplicates
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i];
      const b = invoices[j];
      
      if (a.invoiceNumber !== b.invoiceNumber) {
        const sameSupplier = normalizeText(a.supplierName) === normalizeText(b.supplierName);
        const samePO = normalizeText(a.poNumber) === normalizeText(b.poNumber);
        const sameDate = a.invoiceDate === b.invoiceDate;
        const sameItem = normalizeText(a.itemDescription) === normalizeText(b.itemDescription);
        const sameQty = a.quantityInvoiced === b.quantityInvoiced;
        const samePrice = Math.abs(a.unitPrice - b.unitPrice) < 0.001;
        const sameTotal = Math.abs(a.invoiceTotal - b.invoiceTotal) < 0.001;

        if (sameSupplier && samePO && sameDate && sameItem && sameQty && samePrice && sameTotal) {
          duplicatePairs.add(a.recordId);
          duplicatePairs.add(b.recordId);
        }
      }
    }
  }`,
  `  const duplicatePairs = new Set<string>();
  let nextGroupId = 1;
  const duplicateGroupIds = new Map<string, string>(); // recordId -> groupId
  const duplicateCandidates = new Map<string, any>(); // recordId -> candidate info
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i];
      const b = invoices[j];
      
      if (a.invoiceNumber !== b.invoiceNumber) {
        const sameSupplier = normalizeText(a.supplierName) === normalizeText(b.supplierName);
        const samePO = normalizeText(a.poNumber) === normalizeText(b.poNumber);
        const sameDate = a.invoiceDate === b.invoiceDate;
        const sameItem = normalizeText(a.itemDescription) === normalizeText(b.itemDescription);
        const sameQty = a.quantityInvoiced === b.quantityInvoiced;
        const samePrice = Math.abs(a.unitPrice - b.unitPrice) < 0.001;
        const sameTotal = Math.abs(a.invoiceTotal - b.invoiceTotal) < 0.001;

        if (sameSupplier && samePO && sameDate && sameItem && sameQty && samePrice && sameTotal) {
          duplicatePairs.add(a.recordId);
          duplicatePairs.add(b.recordId);

          let groupId = duplicateGroupIds.get(a.recordId) || duplicateGroupIds.get(b.recordId);
          if (!groupId) {
            groupId = \`GRP-\$\{nextGroupId++\}\`;
          }
          duplicateGroupIds.set(a.recordId, groupId);
          duplicateGroupIds.set(b.recordId, groupId);
          
          if (!duplicateCandidates.has(a.recordId)) duplicateCandidates.set(a.recordId, b);
          if (!duplicateCandidates.has(b.recordId)) duplicateCandidates.set(b.recordId, a);
        }
      }
    }
  }`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch engine 1");
