const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(/useState\("Good"\);/g, `useState("");`);
code = code.replace(/id: \`PO-MANUAL-\$\{mPoNo\}-\$\{Math.floor\(Math.random\(\) \* 1000\)\}\`,/g, `id: \`PO-\$\{mPoNo\}-\$\{Math.floor(Math.random() * 1000)}\`,`);
code = code.replace(/id: \`GRN-MANUAL-\$\{mGrnNo\}-\$\{Math.floor\(Math.random\(\) \* 1000\)\}\`,/g, `id: \`GRN-\$\{mGrnNo\}-\$\{Math.floor(Math.random() * 1000)}\`,`);
code = code.replace(/supplier: mGrnSupplier \|\| "Manual Vendor",/g, `supplier: mGrnSupplier || "",`);
code = code.replace(/receivedBy: mGrnRecvBy \|\| "Manual Receiver",/g, `receivedBy: mGrnRecvBy || "",`);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
