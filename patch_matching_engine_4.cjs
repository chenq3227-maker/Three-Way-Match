const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `      if (a.invoiceNumber !== b.invoiceNumber) {
        const sameSupplier = normalizeText(a.supplierName) === normalizeText(b.supplierName);
        const samePO = normalizeText(a.poNumber) === normalizeText(b.poNumber);
        const sameDate = a.invoiceDate === b.invoiceDate;
        const sameItem = normalizeText(a.itemDescription) === normalizeText(b.itemDescription);
        const sameQty = a.quantityInvoiced === b.quantityInvoiced;
        const samePrice = Math.abs(a.unitPrice - b.unitPrice) < 0.001;
        const sameTotal = Math.abs(a.invoiceTotal - b.invoiceTotal) < 0.001;

        if (sameSupplier && samePO && sameDate && sameItem && sameQty && samePrice && sameTotal) {`,
  `      const sameInvoiceNumber = a.invoiceNumber === b.invoiceNumber;
      
      const sameSupplier = normalizeText(a.supplierName) === normalizeText(b.supplierName);
      const samePO = normalizeText(a.poNumber) === normalizeText(b.poNumber);
      const sameDate = a.invoiceDate === b.invoiceDate;
      const sameItem = normalizeText(a.itemDescription) === normalizeText(b.itemDescription);
      const sameQty = a.quantityInvoiced === b.quantityInvoiced;
      const samePrice = Math.abs(a.unitPrice - b.unitPrice) < 0.001;
      const sameTotal = Math.abs(a.invoiceTotal - b.invoiceTotal) < 0.001;

      // Group as same batch if they have the exact same item/qty/price details OR they share the same invoice number and supplier
      if ((sameSupplier && samePO && sameDate && sameItem && sameQty && samePrice && sameTotal) || (sameInvoiceNumber && sameSupplier)) {`
);

// We should fix Step 1 to NOT overwrite duplicateStatus unless it is mapped from upstream!
// But wait, the original Step 1 code sets it in `handleConfirmMapping` for Single sheet and `buildAndValidateApp1Invoices` for App 1.

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch matching engine 4");
