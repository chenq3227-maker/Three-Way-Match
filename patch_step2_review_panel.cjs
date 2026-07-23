const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `{/* AI REVIEW SCREEN - SIDE BY SIDE PREVIEW & VERIFICATION FORM */}
      {pendingScans.length > 0 && extractedData && (`,
  `{/* AI REVIEW SCREEN - SIDE BY SIDE PREVIEW & VERIFICATION FORM */}
      {pendingScans.length > 0 && (`
);

code = code.replace(
  `{/* Right panel: Extracted Data Audit Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">
                Extracted {scanDocType.toUpperCase()} Fields & Correction Form
              </h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase">AI Draft</span>
            </div>
            
            <div className="flex-1 space-y-4 pr-1">`,
  `{/* Right panel: Extracted Data Audit Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px] overflow-y-auto">
            {currentScan?.error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
                <h4 className="text-sm font-bold text-gray-900 mb-2">Extraction Failed</h4>
                <p className="text-xs text-gray-600 mb-6">{currentScan.error}</p>
                <div className="flex space-x-3">
                  <button onClick={() => {
                    const newPending = [...pendingScans];
                    newPending.splice(currentScanIndex, 1);
                    setPendingScans(newPending);
                    if (currentScanIndex > 0) setCurrentScanIndex(currentScanIndex - 1);
                  }} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    Discard Document
                  </button>
                  <button onClick={() => {
                    const newPending = [...pendingScans];
                    newPending.splice(currentScanIndex, 1);
                    setPendingScans(newPending);
                    if (currentScanIndex > 0) setCurrentScanIndex(currentScanIndex - 1);
                    if (scanDocType === "po") setShowManualPOForm(true);
                    else setShowManualGRNForm(true);
                  }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
                    Manual Entry
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">
                Extracted {scanDocType.toUpperCase()} Fields & Correction Form
              </h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase">AI Draft</span>
            </div>
            
            <div className="flex-1 space-y-4 pr-1">`
);

code = code.replace(
  `{scanError && (
              <div className="w-full text-center p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs">
                {scanError}
              </div>
            )}
            
          </div>
        </motion.div>`,
  `{scanError && (
              <div className="w-full text-center p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs">
                {scanError}
              </div>
            )}
            </>
            )}
          </div>
        </motion.div>`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
