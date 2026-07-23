const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  'followupStatus?: "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval";',
  'followupStatus?: "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval" | "Awaiting Department Approval";'
);
fs.writeFileSync('src/types.ts', code);
console.log("Done");
