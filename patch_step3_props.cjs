const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `interface Props {
  invoices: InvoiceLine[];
  poLines: POLine[];`,
  `interface Props {
  invoices: InvoiceLine[];
  historicalInvoices?: InvoiceLine[];
  poLines: POLine[];`
);

code = code.replace(
  `export default function Step3MatchingDashboard({ 
  invoices, 
  poLines,`,
  `export default function Step3MatchingDashboard({ 
  invoices, 
  historicalInvoices = [],
  poLines,`
);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3 props");
