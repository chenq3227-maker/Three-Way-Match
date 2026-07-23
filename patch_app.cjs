const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `  const [invoices, setInvoices] = useState<InvoiceLine[]>([]);`,
  `  const [invoices, setInvoices] = useState<InvoiceLine[]>([]);
  const [historicalInvoices, setHistoricalInvoices] = useState<InvoiceLine[]>([]);`
);

code = code.replace(
  `      {currentStep === 1 && (
        <Step1InvoiceRegister
          invoices={invoices}
          onUpdateInvoices={setInvoices}`,
  `      {currentStep === 1 && (
        <Step1InvoiceRegister
          historicalInvoices={historicalInvoices}
          setHistoricalInvoices={setHistoricalInvoices}
          invoices={invoices}
          onUpdateInvoices={setInvoices}`
);

code = code.replace(
  `          const matched = await performThreeWayMatch(invoices, poLines, grnLines);`,
  `          const matched = await performThreeWayMatch(invoices, poLines, grnLines, historicalInvoices);`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done patch app");
