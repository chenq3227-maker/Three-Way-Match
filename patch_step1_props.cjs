const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

code = code.replace(
  `interface Props {
  onInvoicesLoaded: (lines: InvoiceLine[], fileName: string) => void;
  existingInvoices: InvoiceLine[];
  onUpdateInvoices: (updated: InvoiceLine[]) => void;`,
  `interface Props {
  historicalInvoices: InvoiceLine[];
  setHistoricalInvoices: (lines: InvoiceLine[]) => void;
  onInvoicesLoaded: (lines: InvoiceLine[], fileName: string) => void;
  existingInvoices: InvoiceLine[];
  onUpdateInvoices: (updated: InvoiceLine[]) => void;`
);

code = code.replace(
  `export function Step1InvoiceRegister({
  onInvoicesLoaded,
  existingInvoices,
  onUpdateInvoices,`,
  `export function Step1InvoiceRegister({
  historicalInvoices,
  setHistoricalInvoices,
  onInvoicesLoaded,
  existingInvoices,
  onUpdateInvoices,`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch step1 props");
