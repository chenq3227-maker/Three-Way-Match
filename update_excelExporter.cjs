const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

const targetOld = `    const isTimestamp = typeof value === "string" && (value.includes(":") || value.toLowerCase().includes("m"));
    
    return {
      __isFormattedCell: true,
      cell: { 
         t: "d", 
         v: parsedDate, 
         z: "dd/mm/yyyy" 
       }
    };`;

const targetNew = `    const isTimestamp = typeof value === "string" && (value.includes(":") || value.toLowerCase().includes("m"));
    
    return {
      __isFormattedCell: true,
      cell: { 
         t: "d", 
         v: parsedDate, 
         z: isTimestamp ? "yyyy-mm-dd hh:mm:ss" : "yyyy-mm-dd" 
       }
    };`;

code = code.replace(targetOld, targetNew);

// Also fix new Date().toLocaleString()
const dateOld = `paymentStatus,
      new Date().toLocaleString() // Timestamp with date/time
    ]);`;

const dateNew = `paymentStatus,
      makeExcelCell(new Date().toLocaleString(), "date")
    ]);`;

code = code.replace(dateOld, dateNew);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Updated excelExporter.ts");
