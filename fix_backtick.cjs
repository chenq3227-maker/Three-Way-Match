const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(/className=\{\\`text-xs/g, "className={`text-xs");
code = code.replace(/\\borderClass\\`\}/g, "borderClass`}");

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
