const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

code = code.replace(
  `      const cellVal = data[r][c];
      
      // header formatting for row 0
      if (r === 0) {
         if (cellVal) {
           ws[cellRef] = { t: "s", v: String(cellVal), s: { font: { bold: true } } };
         }
         continue;
      }
      const cellRef = XLSX.utils.encode_cell({ r, c });`,
  `      const cellVal = data[r][c];
      const cellRef = XLSX.utils.encode_cell({ r, c });
      
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
