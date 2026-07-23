const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

// For single sheet logic in handleConfirmMapping:
code = code.replace(
  `    const counts: Record<string, number> = {};
    updatedInvoices.forEach(inv => {
      const k = \`\$\{inv.invoiceNumber\}_\$\{inv.invoiceDate\}_\$\{inv.invoiceTotal\}\`;
      counts[k] = (counts[k] || 0) + 1;
    });

    const finalBatch = updatedInvoices.map(inv => {
      const k = \`\$\{inv.invoiceNumber\}_\$\{inv.invoiceDate\}_\$\{inv.invoiceTotal\}\`;
      if (counts[k] > 1) {
        return {
          ...inv,
          duplicateStatus: "Exact Duplicate" as const,
          importValidationStatus: "Review Required" as const,
          importValidationReason: \`\$\{inv.importValidationReason || ""\} | Same-batch Exact Duplicate Invoice detected.\`.trim()
        };
      }
      return inv;
    });`,
  `    const finalBatch = updatedInvoices;`
);

// For App1 logic in buildAndValidateApp1Invoices:
code = code.replace(
  `  const batchCounts: Record<string, number> = {};
  builtLines.forEach(inv => {
    if (inv.invoiceNumber && inv.importValidationStatus !== "Blocked") {
      const k = \`\$\{inv.invoiceNumber\}_\$\{inv.invoiceDate\}_\$\{inv.invoiceTotal\}\`;
      batchCounts[k] = (batchCounts[k] || 0) + 1;
    }
  });

  builtLines.forEach(inv => {
    if (!inv.invoiceNumber || inv.importValidationStatus === "Blocked") {
      inv.duplicateStatus = "Clear";
      return;
    }
    const k = \`\$\{inv.invoiceNumber\}_\$\{inv.invoiceDate\}_\$\{inv.invoiceTotal\}\`;
    if (batchCounts[k] > 1) {
      inv.duplicateStatus = "Exact Duplicate";
      inv.importValidationStatus = "Review Required";
      const prev = inv.importValidationReason && inv.importValidationReason !== "All structural checks passed." ? inv.importValidationReason + " | " : "";
      inv.importValidationReason = prev + "Same-batch Exact Duplicate Invoice detected.";
    } else {
      // Check for same Invoice Number but different total
      const matchesNum = builtLines.filter(x => x.invoiceNumber === inv.invoiceNumber && x.recordId !== inv.recordId && x.importValidationStatus !== "Blocked");
      if (matchesNum.length > 0) {
        inv.duplicateStatus = "Possible Duplicate";
        inv.importValidationStatus = "Review Required";
        const prev = inv.importValidationReason && inv.importValidationReason !== "All structural checks passed." ? inv.importValidationReason + " | " : "";
        inv.importValidationReason = prev + "Same-batch Possible Duplicate Invoice detected.";
      } else {
        inv.duplicateStatus = "Clear";
      }
    }
  });`,
  `  // Same-batch duplicate detection is now handled centrally by matchingEngine.ts
  // duplicateStatus field is preserved exclusively for Upstream Extraction Warnings.`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch step1 remove dup");
