const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `{/* Top level fields */}
              {scanDocType === "po" ? (`,
  `{/* Top level fields */}
              {extractedData && scanDocType === "po" ? (`
);
code = code.replace(
  `{/* Items Table */}
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <h5 className="text-xs font-semibold text-gray-800 mb-2">Line Items Extracted</h5>
                {(extractedData.items || []).map((item: any, idx: number) => (`,
  `{/* Items Table */}
              {extractedData && <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <h5 className="text-xs font-semibold text-gray-800 mb-2">Line Items Extracted</h5>
                {(extractedData.items || []).map((item: any, idx: number) => (`
);
code = code.replace(
  `)}
              </div>
              
            </div>`,
  `)}
              </div>}
              
            </div>`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
