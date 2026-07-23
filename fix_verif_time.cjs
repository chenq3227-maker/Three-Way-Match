const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

code = code.replace(
  'const verificationTime = isConfirmed ? (line.humanReview?.timestamp || new Date().toLocaleString()) : "";',
  'const verificationTime = isConfirmed ? (line.humanReview?.timestamp ? makeExcelCell(line.humanReview.timestamp, "date") : makeExcelCell(new Date().toISOString(), "date")) : "";'
);

code = code.replace(
  'const verificationTime = isConfirmed ? po.verifiedRecord.verifiedAt : "";',
  'const verificationTime = isConfirmed && po.verifiedRecord?.verifiedAt ? makeExcelCell(po.verifiedRecord.verifiedAt, "date") : "";'
);

code = code.replace(
  'const verificationTime = isConfirmed ? grn.verifiedRecord.verifiedAt : "";',
  'const verificationTime = isConfirmed && grn.verifiedRecord?.verifiedAt ? makeExcelCell(grn.verifiedRecord.verifiedAt, "date") : "";'
);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done");
