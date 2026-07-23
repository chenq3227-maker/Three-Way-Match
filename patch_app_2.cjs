const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `const matched = await performThreeWayMatch(invoices, poLines, grnLines, historicalInvoices);`,
  `// Reverted back to what it was`
);

code = code.replace(
  `    const matchedResults = runThreeWayMatch(res.invoices, res.poLines, res.grnLines, summaryMappings, granularMappings);`,
  `    const matchedResults = runThreeWayMatch(res.invoices, res.poLines, res.grnLines, summaryMappings, granularMappings, historicalInvoices);`
);

code = code.replace(
  `    const refreshed = runThreeWayMatch(invoices, poLines, grnLines, summaryMappings, granularMappings);`,
  `    const refreshed = runThreeWayMatch(invoices, poLines, grnLines, summaryMappings, granularMappings, historicalInvoices);`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done patch app 2");
