const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

code = code.replace(
  `        } else if (mapping.suggestedField === "currency") {
          line.currency = String(rawVal || "USD");`,
  `        } else if (mapping.suggestedField === "currency") {
          line.currency = String(rawVal || "USD");
        } else if (mapping.suggestedField === "duplicateStatus") {
          line.duplicateStatus = String(rawVal || "Clear") as any;
        } else if (mapping.suggestedField === "duplicateOf") {
          line.duplicateOf = String(rawVal || "");
        } else if (mapping.suggestedField === "extractionStatus") {
          line.extractionStatus = String(rawVal || "clear");
        } else if (mapping.suggestedField === "fieldsRequiringReview") {
          line.fieldsRequiringReview = String(rawVal || "");
        } else if (mapping.suggestedField === "extractionNotes") {
          line.extractionNotes = String(rawVal || "");`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch mapping");
