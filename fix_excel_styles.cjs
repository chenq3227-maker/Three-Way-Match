const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

code = code.replace(
  'if (typeof cellVal === "object" && cellVal.__isFormattedCell) {\n        ws[cellRef] = cellVal.cell;',
  `if (typeof cellVal === "object" && cellVal.__isFormattedCell) {
        ws[cellRef] = cellVal.cell;
        
        // Add styling for Matched/Review/On Hold if it's the specific status text
        if (cellVal.cell && typeof cellVal.cell.v === "string") {
            const v = cellVal.cell.v;
            if (v === "🟢 Matched – Awaiting Department Approval" || v === "Matched – Awaiting Department Approval") {
                cellVal.cell.s = { fill: { fgColor: { rgb: "FFD4EDDA" } }, font: { color: { rgb: "FF155724" } } };
            } else if (v === "🟡 Review Required" || v === "Review Required") {
                cellVal.cell.s = { fill: { fgColor: { rgb: "FFFFF3CD" } }, font: { color: { rgb: "FF856404" } } };
            } else if (v === "🔴 On Hold" || v === "On Hold") {
                cellVal.cell.s = { fill: { fgColor: { rgb: "FFF8D7DA" } }, font: { color: { rgb: "FF721C24" } } };
            }
        }`
);

code = code.replace(
  'ws[cellRef] = { t: "s", v: String(cellVal) };',
  `ws[cellRef] = { t: "s", v: String(cellVal) };
          const strVal = String(cellVal);
          if (strVal === "🟢 Matched – Awaiting Department Approval" || strVal === "Matched – Awaiting Department Approval") {
              ws[cellRef].s = { fill: { fgColor: { rgb: "D4EDDA" } }, font: { color: { rgb: "155724" } } };
          } else if (strVal === "🟡 Review Required" || strVal === "Review Required") {
              ws[cellRef].s = { fill: { fgColor: { rgb: "FFF3CD" } }, font: { color: { rgb: "856404" } } };
          } else if (strVal === "🔴 On Hold" || strVal === "On Hold") {
              ws[cellRef].s = { fill: { fgColor: { rgb: "F8D7DA" } }, font: { color: { rgb: "721C24" } } };
          }`
);

// We need to fix the hex strings above (rgb without FF alpha in standard xlsx? Wait, in xlsx-js-style, ARGB is used. FF + 6 digit hex)
// so D4EDDA -> FFD4EDDA, 155724 -> FF155724

code = code.replace(
  'ws[cellRef].s = { fill: { fgColor: { rgb: "D4EDDA" } }, font: { color: { rgb: "155724" } } };',
  'ws[cellRef].s = { fill: { fgColor: { rgb: "FFD4EDDA" } }, font: { color: { rgb: "FF155724" } } };'
);
code = code.replace(
  'ws[cellRef].s = { fill: { fgColor: { rgb: "FFF3CD" } }, font: { color: { rgb: "856404" } } };',
  'ws[cellRef].s = { fill: { fgColor: { rgb: "FFFFF3CD" } }, font: { color: { rgb: "FF856404" } } };'
);
code = code.replace(
  'ws[cellRef].s = { fill: { fgColor: { rgb: "F8D7DA" } }, font: { color: { rgb: "721C24" } } };',
  'ws[cellRef].s = { fill: { fgColor: { rgb: "FFF8D7DA" } }, font: { color: { rgb: "FF721C24" } } };'
);

// Format header row
code = code.replace(
  'const cellVal = data[r][c];',
  `const cellVal = data[r][c];
      
      // header formatting for row 0
      if (r === 0) {
         if (cellVal) {
           ws[cellRef] = { t: "s", v: String(cellVal), s: { font: { bold: true } } };
         }
         continue;
      }`
);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done");
