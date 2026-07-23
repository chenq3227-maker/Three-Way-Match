const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `            <Step3MatchingDashboard
              invoices={invoices}
              poLines={poLines}
              grnLines={grnLines}`,
  `            <Step3MatchingDashboard
              invoices={invoices}
              historicalInvoices={historicalInvoices}
              poLines={poLines}
              grnLines={grnLines}`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done patch app 4");
