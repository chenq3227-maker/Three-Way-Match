const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/app\.get\("\/api\/ai-status"[\s\S]*?\}\);\n\n\n\/\/ \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\n/, "");
fs.writeFileSync('server.ts', code);
console.log("Done");
