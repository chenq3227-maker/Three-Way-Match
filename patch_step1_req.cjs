const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

code = code.replace(
  `    const missingRequired = TARGET_INVOICE_FIELDS
      .filter((f) => f.required)
      .filter((f) => !mappedFields.includes(f.key));`,
  `    let missingRequired = TARGET_INVOICE_FIELDS
      .filter((f) => f.required)
      .filter((f) => !mappedFields.includes(f.key));

    const duplicateStatusCol = mappings.find(m => m.suggestedField === "duplicateStatus")?.originalColumn;
    const hasDuplicateWarning = duplicateStatusCol && excelRows.some(row => {
      const val = String(row[duplicateStatusCol] || "").trim();
      return val === "Possible Duplicate" || val === "Exact Duplicate";
    });

    if (hasDuplicateWarning && !mappedFields.includes("duplicateOf")) {
       missingRequired.push({ key: "duplicateOf", label: "Duplicate Of", required: true });
    }`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch2");
