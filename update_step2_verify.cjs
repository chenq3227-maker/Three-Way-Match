const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

const replacement = `  // Confirm verification and add to system
  const handleVerifyExtractedDoc = () => {
    if (!reviewerName.trim()) {
      setScanError("Accounts Auditor verification signature (Reviewer Name) is mandatory to log AI data.");
      return;
    }
    
    // Deterministic Checks
    if (currentScanDocType === "po") {
      let documentTotal = Number(extractedData.totalAmount?.value) || 0;
      let calculatedTotal = 0;
      const items = extractedData.items || [];
      
      for (const item of items) {
        const qty = Number(item.quantityOrdered?.value) || 0;
        const price = Number(item.unitPrice?.value) || 0;
        const lineTotal = Number(item.lineTotal?.value) || 0;
        
        if (qty * price > 0 && Math.abs(qty * price - lineTotal) > 0.05) {
          setScanError(\`Line item "\${item.itemDescription?.value}" has a math error: \${qty} * \${price} != \${lineTotal}\`);
          return;
        }
        calculatedTotal += lineTotal;
      }
      
      if (documentTotal > 0 && Math.abs(documentTotal - calculatedTotal) > 0.05) {
         setScanError(\`Document total math error: Sum of lines (\${calculatedTotal.toFixed(2)}) != Document Total (\${documentTotal.toFixed(2)})\`);
         return;
      }
    } else {
      // GRN Checks
      if (!extractedData.poNumber?.value) {
        setScanError("GRN must have an associated PO Number reference.");
        return;
      }
      const items = extractedData.items || [];
      for (const item of items) {
        if (!item.itemDescription?.value) {
          setScanError("All GRN items must have a description.");
          return;
        }
      }
    }

    const timestamp = new Date().toLocaleString();

    if (currentScanDocType === "po") {
      const items = extractedData.items || [];
      const newPOEntries: POLine[] = items.map((item: any, idx: number) => ({
        id: \`PO-AI-\${extractedData.poNumber?.value || "UNKNOWN"}-\${idx}-\${Math.random().toString(36).substr(2, 4)}\`,
        poNumber: String(extractedData.poNumber?.value || ""),
        poDate: formatDate(extractedData.poDate?.value),
        buyer: String(extractedData.buyer?.value || ""),
        supplier: String(extractedData.supplier?.value || ""),
        supplierAddress: String(extractedData.supplierAddress?.value || ""),
        currency: String(extractedData.currency?.value || ""),
        deliveryLocation: String(extractedData.deliveryLocation?.value || ""),
        paymentTerms: String(extractedData.paymentTerms?.value || ""),
        lineNumber: String(item.lineNumber?.value || ""),
        itemDescription: String(item.itemDescription?.value || ""),
        quantityOrdered: Number(item.quantityOrdered?.value) || 0,
        unitPrice: Number(item.unitPrice?.value) || 0,
        totalAmount: Number(item.lineTotal?.value || item.totalAmount?.value) || 0,
        expectedDelivery: formatDate(extractedData.expectedDelivery?.value),
        sourceFileName: uploadedFile?.name || "Scanned PO",
        sourceFileSize: uploadedFile?.size || 0,
        sourceWorkbookName: uploadedFile?.name || "Scanned PO",
        sourceType: "extracted",
        dateParserVersion: "v2-date-only",
        extractionQuality: {
          poNumber: extractedData.poNumber?.status || "clear",
          poDate: extractedData.poDate?.status || "clear",
          buyer: extractedData.buyer?.status || "clear",
          supplier: extractedData.supplier?.status || "clear",
          supplierAddress: extractedData.supplierAddress?.status || "clear",
          currency: extractedData.currency?.status || "clear",
          deliveryLocation: extractedData.deliveryLocation?.status || "clear",
          paymentTerms: extractedData.paymentTerms?.status || "clear",
          lineNumber: item.lineNumber?.status || "clear",
          itemDescription: item.itemDescription?.status || "clear",
          quantityOrdered: item.quantityOrdered?.status || "clear",
          unitPrice: item.unitPrice?.status || "clear",
          totalAmount: item.lineTotal?.status || item.totalAmount?.status || "clear",
          expectedDelivery: extractedData.expectedDelivery?.status || "clear",
        },
        originalValues: {
          poNumber: extractedData.poNumber?.originalText || extractedData.poNumber?.value,
          poDate: extractedData.poDate?.originalText || extractedData.poDate?.value,
          supplier: extractedData.supplier?.originalText || extractedData.supplier?.value,
          itemDescription: item.itemDescription?.originalText || item.itemDescription?.value,
          quantityOrdered: item.quantityOrdered?.originalText || item.quantityOrdered?.value,
          unitPrice: item.unitPrice?.originalText || item.unitPrice?.value,
          totalAmount: item.lineTotal?.originalText || item.lineTotal?.value || item.totalAmount?.originalText || item.totalAmount?.value,
          expectedDelivery: extractedData.expectedDelivery?.originalText || extractedData.expectedDelivery?.value
        },
        verifiedRecord: {
          reviewerName,
          verifiedAt: \`\${timestamp} - Notes: \${verificationNotes || "None"}\`
        }
      }));

      setLocalPOs(prev => [...prev, ...newPOEntries]);
    } else {
      // GRN
      const items = extractedData.items || [];
      const newGRNEntries: GRNLine[] = items.map((item: any, idx: number) => ({
        id: \`GRN-AI-\${extractedData.grnNumber?.value || "UNKNOWN"}-\${idx}-\${Math.random().toString(36).substr(2, 4)}\`,
        grnNumber: String(extractedData.grnNumber?.value || ""),
        grnDate: formatDate(extractedData.grnDate?.value),
        poNumber: String(extractedData.poNumber?.value || ""),
        supplier: String(extractedData.supplier?.value || ""),
        warehouse: String(extractedData.warehouse?.value || ""),
        signaturePresent: Boolean(extractedData.signaturePresent?.value),
        remarks: String(extractedData.remarks?.value || ""),
        itemDescription: String(item.itemDescription?.value || ""),
        quantityOrdered: Number(item.quantityOrdered?.value) || 0,
        quantityReceived: Number(item.quantityReceived?.value) || 0,
        condition: String(item.condition?.value || "Uncertain"),
        receivedBy: String(extractedData.receivedBy?.value || "N/A"),
        sourceFileName: uploadedFile?.name || "Scanned GRN",
        sourceFileSize: uploadedFile?.size || 0,
        sourceWorkbookName: uploadedFile?.name || "Scanned GRN",
        sourceType: "extracted",
        dateParserVersion: "v2-date-only",
        extractionQuality: {
          grnNumber: extractedData.grnNumber?.status || "clear",
          grnDate: extractedData.grnDate?.status || "clear",
          poNumber: extractedData.poNumber?.status || "clear",
          supplier: extractedData.supplier?.status || "clear",
          warehouse: extractedData.warehouse?.status || "clear",
          signaturePresent: extractedData.signaturePresent?.status || "clear",
          remarks: extractedData.remarks?.status || "clear",
          itemDescription: item.itemDescription?.status || "clear",
          quantityOrdered: item.quantityOrdered?.status || "clear",
          quantityReceived: item.quantityReceived?.status || "clear",
          condition: item.condition?.status || "clear",
          receivedBy: extractedData.receivedBy?.status || "clear",
        },
        originalValues: {
          grnNumber: extractedData.grnNumber?.originalText || extractedData.grnNumber?.value,
          grnDate: extractedData.grnDate?.originalText || extractedData.grnDate?.value,
          poNumber: extractedData.poNumber?.originalText || extractedData.poNumber?.value,
          supplier: extractedData.supplier?.originalText || extractedData.supplier?.value,
          itemDescription: item.itemDescription?.originalText || item.itemDescription?.value,
          quantityReceived: item.quantityReceived?.originalText || item.quantityReceived?.value,
          condition: item.condition?.originalText || item.condition?.value,
          receivedBy: extractedData.receivedBy?.originalText || extractedData.receivedBy?.value
        },
        verifiedRecord: {
          reviewerName,
          verifiedAt: \`\${timestamp} - Notes: \${verificationNotes || "None"}\`
        }
      }));

      setLocalGRNs(prev => [...prev, ...newGRNEntries]);
    }`;

code = code.replace(/  \/\/ Confirm verification and add to system[\s\S]*?setLocalGRNs\(prev => \[\.\.\.prev, \.\.\.newGRNEntries\]\);\n    \}/, replacement);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Updated handleVerifyExtractedDoc");
