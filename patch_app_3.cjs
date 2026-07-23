const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `          {activeStep === 1 && (
            <Step1InvoiceRegister 
              onInvoicesLoaded={handleInvoicesLoaded} 
              existingInvoices={invoices} 
              onUpdateInvoices={handleUpdateInvoices}`,
  `          {activeStep === 1 && (
            <Step1InvoiceRegister 
              historicalInvoices={historicalInvoices}
              setHistoricalInvoices={setHistoricalInvoices}
              onInvoicesLoaded={handleInvoicesLoaded} 
              existingInvoices={invoices} 
              onUpdateInvoices={handleUpdateInvoices}`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done patch app 3");
