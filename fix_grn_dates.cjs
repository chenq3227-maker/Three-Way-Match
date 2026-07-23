const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

// Replace grnDates in the push block
code = code.replace(
  'grnDates, // Literal strings of Dates',
  'itemGRNs.length > 0 && itemGRNs[0].grnDate ? makeExcelCell(itemGRNs[0].grnDate, "date") : "",'
);

// Replace humanReview timestamp in Match Results
code = code.replace(
  'line.humanReview?.timestamp || ""\n    ]);',
  'line.humanReview?.timestamp ? makeExcelCell(line.humanReview.timestamp, "date") : ""\n    ]);'
);

// Replace humanReview timestamp in Exception Log
code = code.replace(
  'line.humanReview?.timestamp || ""\n        ]);',
  'line.humanReview?.timestamp ? makeExcelCell(line.humanReview.timestamp, "date") : ""\n        ]);'
);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done");
