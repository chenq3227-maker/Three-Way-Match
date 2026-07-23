const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(/\\\$\{bgClass\}/g, "${bgClass}");
code = code.replace(/\\\$\{textClass\}/g, "${textClass}");
code = code.replace(/\\\$\{borderClass\}\\`\}/g, "${borderClass}`}");

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
