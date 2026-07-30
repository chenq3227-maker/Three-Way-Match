const fs = require('fs');

// Step 1
let code1 = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');
code1 = code1.replace(/Please enter a valid date in DD\/MM\/YYYY format\./g, "Please enter a valid date in YYYY-MM-DD format.");
code1 = code1.replace(/placeholder="DD\/MM\/YYYY"/g, 'placeholder="YYYY-MM-DD"');
code1 = code1.replace(/title="Type custom DD\/MM\/YYYY date"/g, 'title="Type custom YYYY-MM-DD date"');
fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code1);

// Step 2
let code2 = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');
code2 = code2.replace(/"PO Date \(DD\/MM\/YYYY\)"/g, '"PO Date (YYYY-MM-DD)"');
code2 = code2.replace(/"GRN Date \(DD\/MM\/YYYY\)"/g, '"GRN Date (YYYY-MM-DD)"');
fs.writeFileSync('src/components/Step2POGRNInput.tsx', code2);

console.log("Updated components");
