const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `<h4 className="text-xs font-semibold text-gray-900">Upload Document Image or PDF</h4>`,
  `<h4 className="text-xs font-semibold text-gray-900">Analyse Document Image or PDF</h4>`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
