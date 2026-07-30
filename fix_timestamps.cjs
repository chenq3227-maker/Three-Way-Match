const fs = require('fs');

const createHelper = `export function getFormattedTimestamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return \`\${y}-\${m}-\${day} \${hh}:\${mm}:\${ss}\`;
}`;

fs.writeFileSync('src/lib/timestamp.ts', createHelper);

const files = [
  'src/lib/excelExporter.ts',
  'src/components/Step1InvoiceRegister.tsx',
  'src/components/Step3MatchingDashboard.tsx',
  'src/components/Step2POGRNInput.tsx',
  'src/App.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('new Date().toLocaleString()')) {
    // Add import if not present
    const depth = file.split('/').length - 2;
    const relPath = depth === 0 ? './lib/timestamp' : '../lib/timestamp';
    
    if (!content.includes('getFormattedTimestamp')) {
      content = `import { getFormattedTimestamp } from "${relPath}";\n` + content;
    }
    
    content = content.replace(/new Date\(\)\.toLocaleString\(\)/g, 'getFormattedTimestamp()');
    fs.writeFileSync(file, content);
  }
}

console.log("Fixed timestamps");
