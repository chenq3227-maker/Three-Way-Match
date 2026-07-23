const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

// Remove duplicate Awaiting line
code = code.replace(/if \(status === "Awaiting Department Approval"\) return "🔵 Awaiting Department Approval";\n  /, '');

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Done");
