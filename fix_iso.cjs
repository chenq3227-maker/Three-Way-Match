const fs = require('fs');

const files = [
  'src/components/Step1InvoiceRegister.tsx',
  'src/components/Step2POGRNInput.tsx',
  'src/lib/excelExporter.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('new Date().toISOString()')) {
    content = content.replace(/new Date\(\)\.toISOString\(\)/g, 'getFormattedTimestamp()');
    fs.writeFileSync(file, content);
  }
}
console.log("Replaced toISOString with getFormattedTimestamp");
