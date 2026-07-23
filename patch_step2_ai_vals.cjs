const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(/id: \`PO-AI-\$\{extractedData\.poNumber\?\.value \|\| "UNKNOWN"\}\-\$\{idx\}-\$\{Math\.random\(\)\.toString\(36\)\.substr\(2, 4\)\}\`,/g,
  `id: \`PO-AI-\$\{extractedData.poNumber?.value || ""\}-\$\{idx\}-\$\{Math.random().toString(36).substr(2, 4)}\`,`);

code = code.replace(/id: \`GRN-AI-\$\{extractedData\.grnNumber\?\.value \|\| "UNKNOWN"\}\-\$\{idx\}-\$\{Math\.random\(\)\.toString\(36\)\.substr\(2, 4\)\}\`,/g,
  `id: \`GRN-AI-\$\{extractedData.grnNumber?.value || ""\}-\$\{idx\}-\$\{Math.random().toString(36).substr(2, 4)}\`,`);

code = code.replace(/quantityOrdered: Number\(item\.quantityOrdered\?\.value\) \|\| 0,/g,
  `quantityOrdered: (item.quantityOrdered?.value !== undefined && item.quantityOrdered?.value !== "") ? Number(item.quantityOrdered?.value) : ("" as any),`);

code = code.replace(/quantityReceived: Number\(item\.quantityReceived\?\.value\) \|\| 0,/g,
  `quantityReceived: (item.quantityReceived?.value !== undefined && item.quantityReceived?.value !== "") ? Number(item.quantityReceived?.value) : ("" as any),`);

code = code.replace(/unitPrice: Number\(item\.unitPrice\?\.value\) \|\| 0,/g,
  `unitPrice: (item.unitPrice?.value !== undefined && item.unitPrice?.value !== "") ? Number(item.unitPrice?.value) : ("" as any),`);

code = code.replace(/totalAmount: Number\(item\.lineTotal\?\.value \|\| item\.totalAmount\?\.value\) \|\| 0,/g,
  `totalAmount: ((item.lineTotal?.value || item.totalAmount?.value) !== undefined && (item.lineTotal?.value || item.totalAmount?.value) !== "") ? Number(item.lineTotal?.value || item.totalAmount?.value) : ("" as any),`);

code = code.replace(/condition: String\(item\.condition\?\.value \|\| "Uncertain"\),/g,
  `condition: String(item.condition?.value || ""),`);

code = code.replace(/receivedBy: String\(extractedData\.receivedBy\?\.value \|\| "N\/A"\),/g,
  `receivedBy: String(extractedData.receivedBy?.value || ""),`);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
