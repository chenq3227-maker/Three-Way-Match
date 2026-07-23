const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

code = code.replace(/documentVerificationCheck,\n      qtyDifferencePO !== "" \? makeExcelCell\(qtyDifferencePO, "number"\) : "",/, 
`documentVerificationCheck,
      line.duplicateCandidateRecordId || "",
      line.duplicateCandidateInvoiceNumber || "",
      line.duplicateCheckSource || "",
      line.duplicateReason || "",
      line.duplicateReviewDecision || "",
      line.duplicateIdentifiedOriginalId || "",
      qtyDifferencePO !== "" ? makeExcelCell(qtyDifferencePO, "number") : "",`);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done");
