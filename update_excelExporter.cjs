const fs = require('fs');
let code = fs.readFileSync('src/lib/excelExporter.ts', 'utf8');

const targetOld = `    // Map App 3 Handoff Status Rules
    let app3IntakeStatus = "";`;

const targetNew = `    // Accepted Payment Method resolution
    const paymentMethodsSet = new Set<string>();
    invoiceLines.forEach(l => {
      const pm = (l.acceptedPaymentMethod || "").trim();
      if (pm) {
        paymentMethodsSet.add(pm);
      }
    });

    let finalPaymentMethod = "Not Provided";
    if (paymentMethodsSet.size === 1) {
      finalPaymentMethod = Array.from(paymentMethodsSet)[0];
    } else if (paymentMethodsSet.size > 1) {
      finalPaymentMethod = "Confirmation Required";
    }

    // Map App 3 Handoff Status Rules
    let app3IntakeStatus = "";`;

code = code.replace(targetOld, targetNew);

const rowTargetOld = `      refLine.paymentTerms || "",
      refLine.acceptedPaymentMethod || "",
      refLine.bankDetails || "",`;

const rowTargetNew = `      refLine.paymentTerms || "",
      finalPaymentMethod,
      refLine.bankDetails || "",`;

code = code.replace(rowTargetOld, rowTargetNew);

fs.writeFileSync('src/lib/excelExporter.ts', code);
console.log("Updated excelExporter.ts");
