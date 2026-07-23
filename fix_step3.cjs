const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(/    <\/div>\n  \);\n\}\n\}/g, "    </div>\n  );\n}");

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
