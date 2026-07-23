const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

code = code.replace(
  `export default function Step1InvoiceRegister({ 
  onInvoicesLoaded,
  existingInvoices,
  onUpdateInvoices,`,
  `export default function Step1InvoiceRegister({ 
  historicalInvoices,
  setHistoricalInvoices,
  onInvoicesLoaded,
  existingInvoices,
  onUpdateInvoices,`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch step1 export");
