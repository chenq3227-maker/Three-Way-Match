const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

code = code.replace(
  `    "Duplicate Check Source",
    "Duplicate Reason",
    "Duplicate Review Decision",`,
  `    "Duplicate Check Source",
    "Duplicate Reason",
    "Duplicate Review Decision",
    "Duplicate True Original ID",`
);

code = code.replace(
  `      const dupDecision = line.duplicateReviewDecision || "";`,
  `      const dupDecision = line.duplicateReviewDecision || "";
      const dupTrueOriginal = line.duplicateIdentifiedOriginalId || "";`
);

code = code.replace(
  `      dupCheckSource,
      dupReason,
      dupDecision,
      invPoQtyDiff,`,
  `      dupCheckSource,
      dupReason,
      dupDecision,
      dupTrueOriginal,
      invPoQtyDiff,`
);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done patch exporter 2");
