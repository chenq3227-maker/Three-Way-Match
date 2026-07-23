const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

const rightPanelOld = `          {/* Right panel: Extracted Data Audit Form */}
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
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">
                Extracted {scanDocType.toUpperCase()} Fields & Correction Form
              </h4>
              <div className="flex flex-col items-end">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase">AI Draft</span>
                {currentScan?.diagnostics && (
                  <div className="mt-1 text-[9px] text-gray-500 text-right leading-tight">
                    <div>MIME: {currentScan.diagnostics.mimeType} | Model: {currentScan.diagnostics.model}</div>
                    <div>Validation: {currentScan.diagnostics.validation}</div>
                  </div>
                )}
              </div>
            </div>`;

const rightPanelNew = `          {/* Right panel: Extracted Data Audit Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px] overflow-y-auto">
            {currentScan?.error && (
               <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-medium flex items-start space-x-2">
                 <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                 <span>{currentScan.error}</span>
               </div>
            )}
            {currentScan?.status !== "success" && (
              <button
                onClick={() => handleAnalyseDocument(currentScanIndex)}
                disabled={isQuotaExceeded || scanLoading}
                className={\`mb-4 px-4 py-2 rounded-lg text-sm font-semibold text-white transition flex justify-center \${
                  isQuotaExceeded || scanLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }\`}
              >
                {scanLoading ? "Analysing..." : "Analyse Document"}
              </button>
            )}
              <>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">
                {currentScan?.status === "success" ? \`Extracted \${scanDocType.toUpperCase()} Fields & Correction Form\` : \`Manual Entry Form\`}
              </h4>
              <div className="flex flex-col items-end">
                {currentScan?.status === "success" && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase">AI Draft</span>}
              </div>
            </div>
            
            {currentScan?.diagnostics && currentScan?.status === "success" && (
              <div className="mb-4 text-xs">
                <button 
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="text-gray-500 hover:text-gray-700 font-semibold flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Technical Details</span>
                </button>
                {showTechnicalDetails && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[9px] text-gray-600">
                    <div>MIME: {currentScan.diagnostics.mimeType} | Model: {currentScan.diagnostics.model}</div>
                    <div>Validation: {currentScan.diagnostics.validation}</div>
                    <div className="mt-1 font-mono break-all">{JSON.stringify(currentScan.extractedData)}</div>
                  </div>
                )}
              </div>
            )}`;

code = code.replace(rightPanelOld, rightPanelNew);

// Since we removed the check for `currentScan.error` wrapping the whole form,
// we also need to remove the corresponding `</>` and `)}` at the end of the form.
// Let's find where it closes.
