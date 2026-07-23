const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `          {/* Right panel: Extracted Data Audit Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">`,
  `          {/* Right panel: Extracted Data Audit Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px] overflow-y-auto">
            {currentScan?.error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
                <h4 className="text-sm font-bold text-gray-900 mb-2">Extraction Failed</h4>
                <p className="text-xs text-gray-600 mb-6">{currentScan.error}</p>
                <div className="flex space-x-3">
                  <button onClick={() => {
                    setPendingScans(prev => {
                      const updated = [...prev];
                      updated.splice(currentScanIndex, 1);
                      return updated;
                    });
                    if (currentScanIndex > 0 && currentScanIndex >= pendingScans.length - 1) {
                      setCurrentScanIndex(Math.max(0, pendingScans.length - 2));
                    }
                  }} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    Discard Document
                  </button>
                  <button onClick={() => {
                    setPendingScans(prev => {
                      const updated = [...prev];
                      updated.splice(currentScanIndex, 1);
                      return updated;
                    });
                    if (currentScanIndex > 0 && currentScanIndex >= pendingScans.length - 1) {
                      setCurrentScanIndex(Math.max(0, pendingScans.length - 2));
                    }
                    if (scanDocType === "po") setShowManualPOForm(true);
                    else setShowManualGRNForm(true);
                  }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
                    Manual Entry
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">`
);

code = code.replace(
  `              <button
                onClick={handleVerifyExtractedDoc}
                className="flex items-center space-x-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
              >
                <UserCheck className="h-4 w-4" />
                <span>Verify & Commit Document</span>
              </button>
            </div>
          </div>
          </div>
        </motion.div>
      )}`,
  `              <button
                onClick={handleVerifyExtractedDoc}
                className="flex items-center space-x-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
              >
                <UserCheck className="h-4 w-4" />
                <span>Verify & Commit Document</span>
              </button>
            </div>
            </>
            )}
          </div>
          </div>
        </motion.div>
      )}`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
