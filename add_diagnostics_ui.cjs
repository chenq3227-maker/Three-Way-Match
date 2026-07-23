const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">
                Extracted {scanDocType.toUpperCase()} Fields & Correction Form
              </h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase">AI Draft</span>
            </div>`,
  `            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
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
            </div>`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
