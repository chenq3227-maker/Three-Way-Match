const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

// Replace handleExport
code = code.replace(/const handleExport = \(\) => \{[\s\S]*?exportMatchingResults\(invoices, poLines, grnLines\);\n  \};/, 
`const handleExport = () => {
    setExportError(null);
    exportMatchingResults(invoices, poLines, grnLines);
  };`);

// Update export button
code = code.replace(/onClick=\{isOutdated \? undefined : handleExport\}\n              disabled=\{isOutdated\}\n              className=\{`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition \$\{\n                isOutdated \n                  \? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" \n                  : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"\n              \}`\}\n              title=\{isOutdated \? "Rematch Required before exporting results" : "Export results to Excel"\}/, 
`onClick={invoices.length === 0 ? undefined : handleExport}
              disabled={invoices.length === 0}
              className={\`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition \${
                invoices.length === 0 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              }\`}
              title={invoices.length === 0 ? "No matching results to export" : "Export results to Excel"}`);

// Update status pill color in table
code = code.replace(/line\.overallStatus\?\.includes\("Matched"\)\n                            \? "bg-emerald-50 text-emerald-700 border border-emerald-100"/, 
`(line.overallStatus === "Awaiting Department Approval" || line.overallStatus?.includes("Matched"))
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"`);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
