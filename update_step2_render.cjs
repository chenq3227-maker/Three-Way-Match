const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

// replace renderExtractedField helper
const renderHelperReplacement = `// ----------------------------------------------------------------------
// Extracted Field Form Row Helper Component
// ----------------------------------------------------------------------
function renderExtractedField(
  label: string,
  fieldKey: string,
  value: any,
  status: ExtractedFieldStatus,
  onChange: (key: string, val: any) => void,
  originalText?: string,
  note?: string
) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <label className="font-semibold text-gray-600">{label}</label>
        <span className={\`px-1.5 py-0.5 rounded font-semibold uppercase \${
          status === "clear" ? "bg-green-100 text-green-700" :
          status === "human corrected" ? "bg-blue-100 text-blue-700" :
          status === "missing" ? "bg-gray-100 text-gray-700" :
          "bg-yellow-100 text-yellow-700"
        }\`}>
          {status}
        </span>
      </div>
      <input
        type="text"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={\`w-full text-sm p-2 border rounded-md focus:ring-1 focus:outline-none transition \${
          status === "uncertain" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50/30" :
          status === "missing" ? "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50" :
          status === "human corrected" ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500" :
          "border-gray-200 focus:border-green-500 focus:ring-green-500"
        }\`}
      />
      {(originalText || note) && (
        <div className="text-[10px] text-gray-500 flex flex-col">
          {originalText && <span className="truncate">Original: <span className="font-mono">{originalText}</span></span>}
          {note && <span className="text-yellow-700 truncate">{note}</span>}
        </div>
      )}
    </div>
  );
}`;

code = code.replace(/\/\/ ----------------------------------------------------------------------\n\/\/ Extracted Field Form Row Helper Component\n\/\/ ----------------------------------------------------------------------\nfunction renderExtractedField\([\s\S]*?\)\s*\{[\s\S]*?return \([\s\S]*?<\/[dD]iv>\n  \);\n\}/, renderHelperReplacement);

// replace rendering inside Step2
const fieldsReplacement = `{/* Top level fields */}
              {scanDocType === "po" ? (
                <>
                  {renderExtractedField("PO Number", "poNumber", extractedData.poNumber?.value, extractedData.poNumber?.status, handleExtractedFieldChange, extractedData.poNumber?.originalText, extractedData.poNumber?.note)}
                  {renderExtractedField("PO Date (DD/MM/YYYY)", "poDate", extractedData.poDate?.value, extractedData.poDate?.status, handleExtractedFieldChange, extractedData.poDate?.originalText, extractedData.poDate?.note)}
                  {renderExtractedField("Buyer", "buyer", extractedData.buyer?.value, extractedData.buyer?.status, handleExtractedFieldChange, extractedData.buyer?.originalText, extractedData.buyer?.note)}
                  {renderExtractedField("Supplier", "supplier", extractedData.supplier?.value, extractedData.supplier?.status, handleExtractedFieldChange, extractedData.supplier?.originalText, extractedData.supplier?.note)}
                  {renderExtractedField("Supplier Address", "supplierAddress", extractedData.supplierAddress?.value, extractedData.supplierAddress?.status, handleExtractedFieldChange, extractedData.supplierAddress?.originalText, extractedData.supplierAddress?.note)}
                  {renderExtractedField("Currency", "currency", extractedData.currency?.value, extractedData.currency?.status, handleExtractedFieldChange, extractedData.currency?.originalText, extractedData.currency?.note)}
                  {renderExtractedField("Delivery Location", "deliveryLocation", extractedData.deliveryLocation?.value, extractedData.deliveryLocation?.status, handleExtractedFieldChange, extractedData.deliveryLocation?.originalText, extractedData.deliveryLocation?.note)}
                  {renderExtractedField("Payment Terms", "paymentTerms", extractedData.paymentTerms?.value, extractedData.paymentTerms?.status, handleExtractedFieldChange, extractedData.paymentTerms?.originalText, extractedData.paymentTerms?.note)}
                  {renderExtractedField("Expected Delivery", "expectedDelivery", extractedData.expectedDelivery?.value, extractedData.expectedDelivery?.status, handleExtractedFieldChange, extractedData.expectedDelivery?.originalText, extractedData.expectedDelivery?.note)}
                  {renderExtractedField("Total Amount", "totalAmount", extractedData.totalAmount?.value, extractedData.totalAmount?.status, handleExtractedFieldChange, extractedData.totalAmount?.originalText, extractedData.totalAmount?.note)}
                </>
              ) : (
                <>
                  {renderExtractedField("GRN Number", "grnNumber", extractedData.grnNumber?.value, extractedData.grnNumber?.status, handleExtractedFieldChange, extractedData.grnNumber?.originalText, extractedData.grnNumber?.note)}
                  {renderExtractedField("GRN Date (DD/MM/YYYY)", "grnDate", extractedData.grnDate?.value, extractedData.grnDate?.status, handleExtractedFieldChange, extractedData.grnDate?.originalText, extractedData.grnDate?.note)}
                  {renderExtractedField("PO Number Ref", "poNumber", extractedData.poNumber?.value, extractedData.poNumber?.status, handleExtractedFieldChange, extractedData.poNumber?.originalText, extractedData.poNumber?.note)}
                  {renderExtractedField("Supplier", "supplier", extractedData.supplier?.value, extractedData.supplier?.status, handleExtractedFieldChange, extractedData.supplier?.originalText, extractedData.supplier?.note)}
                  {renderExtractedField("Warehouse", "warehouse", extractedData.warehouse?.value, extractedData.warehouse?.status, handleExtractedFieldChange, extractedData.warehouse?.originalText, extractedData.warehouse?.note)}
                  {renderExtractedField("Received By", "receivedBy", extractedData.receivedBy?.value, extractedData.receivedBy?.status, handleExtractedFieldChange, extractedData.receivedBy?.originalText, extractedData.receivedBy?.note)}
                  {renderExtractedField("Signature Present (true/false)", "signaturePresent", extractedData.signaturePresent?.value, extractedData.signaturePresent?.status, handleExtractedFieldChange, extractedData.signaturePresent?.originalText, extractedData.signaturePresent?.note)}
                  {renderExtractedField("Remarks", "remarks", extractedData.remarks?.value, extractedData.remarks?.status, handleExtractedFieldChange, extractedData.remarks?.originalText, extractedData.remarks?.note)}
                </>
              )}

              {/* Items Table */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <h5 className="text-xs font-semibold text-gray-800 mb-2">Line Items Extracted</h5>
                {(extractedData.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="border-b border-gray-100 last:border-b-0 py-3 space-y-2">
                    <div className="text-[10px] font-bold text-gray-400">LINE ITEM #{idx+1}</div>
                    {renderExtractedField(
                      "Description",
                      "itemDescription",
                      item.itemDescription?.value,
                      item.itemDescription?.status,
                      (k, v) => handleExtractedFieldChange(k, v, idx, "itemDescription"),
                      item.itemDescription?.originalText,
                      item.itemDescription?.note
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      {scanDocType === "po" ? (
                        <>
                          {renderExtractedField(
                            "Quantity Ordered",
                            "quantityOrdered",
                            item.quantityOrdered?.value,
                            item.quantityOrdered?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "quantityOrdered"),
                            item.quantityOrdered?.originalText,
                            item.quantityOrdered?.note
                          )}
                          {renderExtractedField(
                            "Unit Price",
                            "unitPrice",
                            item.unitPrice?.value,
                            item.unitPrice?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "unitPrice"),
                            item.unitPrice?.originalText,
                            item.unitPrice?.note
                          )}
                          {renderExtractedField(
                            "Line Total",
                            "lineTotal",
                            item.lineTotal?.value || item.totalAmount?.value,
                            item.lineTotal?.status || item.totalAmount?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "lineTotal"),
                            item.lineTotal?.originalText || item.totalAmount?.originalText,
                            item.lineTotal?.note || item.totalAmount?.note
                          )}
                        </>
                      ) : (
                        <>
                          {renderExtractedField(
                            "Quantity Ordered",
                            "quantityOrdered",
                            item.quantityOrdered?.value,
                            item.quantityOrdered?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "quantityOrdered"),
                            item.quantityOrdered?.originalText,
                            item.quantityOrdered?.note
                          )}
                          {renderExtractedField(
                            "Quantity Received",
                            "quantityReceived",
                            item.quantityReceived?.value,
                            item.quantityReceived?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "quantityReceived"),
                            item.quantityReceived?.originalText,
                            item.quantityReceived?.note
                          )}
                          {renderExtractedField(
                            "Condition",
                            "condition",
                            item.condition?.value,
                            item.condition?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "condition"),
                            item.condition?.originalText,
                            item.condition?.note
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>`;

code = code.replace(/\{\/\* Top level fields \*\/\}\n[\s\S]*?\{\/\* Items Table \*\/\}\n              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50\/50">\n                <h5 className="text-xs font-semibold text-gray-800 mb-2">Line Items Extracted<\/h5>\n                \{\(extractedData.items \|\| \[\]\).map\(\(item: any, idx: number\) => \(\n                  <div key=\{idx\} className="border-b border-gray-100 last:border-b-0 py-3 space-y-2">\n                    <div className="text-\[10px\] font-bold text-gray-400">LINE ITEM #\{idx\+1\}<\/div>\n[\s\S]*?<\/div>\n                  <\/div>\n                \)\)\}\n              <\/div>/, fieldsReplacement);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Updated step2 render fields");
