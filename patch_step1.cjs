const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

code = code.replace(
  `  { key: "duplicateStatus", label: "Duplicate Status", required: false },`,
  `  { key: "duplicateStatus", label: "Duplicate Status", required: false },
  { key: "duplicateOf", label: "Duplicate Of", required: false },`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch1");
