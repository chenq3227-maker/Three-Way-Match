const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `                      {exc.type === "Invoice Register Duplicate Warning" && (
                        <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Flagged by OCR - Review Historic Ledger</span>
                        </div>
                      )}`,
  `                      {exc.type.includes("Duplicate Warning") && (
                        <div className="mt-3">
                           <button
                             type="button"
                             onClick={() => setShowDuplicateCompareModal(true)}
                             className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors"
                           >
                             <AlertTriangle className="h-3.5 w-3.5" />
                             <span>Compare Duplicate Candidates</span>
                           </button>
                        </div>
                      )}`
);

// We need to add the modal at the end of the file.
const modalCode = `
      {/* Duplicate Comparison Modal */}
      {showDuplicateCompareModal && selectedLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <span>Duplicate Candidate Comparison</span>
              </h2>
              <button onClick={() => setShowDuplicateCompareModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Duplicate Check Context</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-xs text-gray-600 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  <div>
                    <span className="block font-bold text-gray-900 mb-1">Check Source</span>
                    {selectedLine.duplicateCheckSource || "Unknown"}
                  </div>
                  <div>
                    <span className="block font-bold text-gray-900 mb-1">Group ID</span>
                    {selectedLine.duplicateGroupId || "N/A"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="block font-bold text-gray-900 mb-1">Reason</span>
                    {selectedLine.duplicateReason || "Flagged as duplicate."}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Current Record */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 border-b border-gray-200 p-3 text-center">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Current Record Under Review</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Record ID</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.recordId}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Supplier</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.supplierName}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Invoice Number</div>
                      <div className="col-span-2 font-bold text-indigo-600 text-right">{selectedLine.invoiceNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Source File</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right truncate" title={selectedLine.sourceFileName}>{selectedLine.sourceFileName}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">PO Number</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.poNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Invoice Date</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.invoiceDate}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Item</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right truncate" title={selectedLine.itemDescription}>{selectedLine.itemDescription}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Qty x Price</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.quantityInvoiced} x {selectedLine.currency} {selectedLine.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs pt-1">
                      <div className="font-bold text-gray-900">Invoice Total</div>
                      <div className="col-span-2 font-bold text-gray-900 text-right">{selectedLine.currency} {selectedLine.invoiceTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Candidate Record */}
                <div className="border border-rose-200 rounded-xl overflow-hidden shadow-sm bg-rose-50/10">
                  <div className="bg-rose-50 border-b border-rose-200 p-3 text-center">
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Candidate / Original Record</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Record ID</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.duplicateCandidateRecordId || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Supplier</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.supplierName || selectedLine.supplierName || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Invoice Number</div>
                      <div className="col-span-2 font-bold text-rose-600 text-right">{selectedLine.duplicateCandidateInvoiceNumber || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Source File</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right truncate" title={selectedLine.duplicateCandidateSourceFile}>{selectedLine.duplicateCandidateSourceFile || "Historical Database"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">PO Number</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.poNumber || selectedLine.poNumber || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Invoice Date</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.invoiceDate || selectedLine.invoiceDate || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Item</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right truncate" title={invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.itemDescription || selectedLine.itemDescription}>{invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.itemDescription || selectedLine.itemDescription || "N/A"}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Qty x Price</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.quantityInvoiced || selectedLine.quantityInvoiced} x {(invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.currency || selectedLine.currency)} {(invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.unitPrice || selectedLine.unitPrice)?.toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs pt-1">
                      <div className="font-bold text-gray-900">Invoice Total</div>
                      <div className="col-span-2 font-bold text-gray-900 text-right">{(invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.currency || selectedLine.currency)} {(invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId)?.invoiceTotal || selectedLine.invoiceTotal)?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(/    <\/div>\n  \);\n\}/, modalCode + "\n}");

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3-compare");
