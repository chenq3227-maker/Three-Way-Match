const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
`      {/* METHOD 2: AI SCAN PANEL */}
      {inputMethod === "ai_scan" && pendingScans.length === 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Method 2: Scan Printed POs & Handwritten GRNs</h3>
          <p className="text-xs text-gray-500 mb-5">
            Upload PDF scans of printed POs or photos of handwritten delivery checklists. The in-app AP assistant will extract core numbers, quantities, condition statuses, and signatures.
          </p>`,
`      {/* METHOD 2: AI SCAN PANEL */}
      {inputMethod === "ai_scan" && pendingScans.length === 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-semibold text-gray-900">Method 2: Scan Printed POs & Handwritten GRNs</h3>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">AI Service Status:</span>
              <span className={\`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded \${
                aiStatus === "Connected" ? "bg-emerald-50 text-emerald-600" :
                aiStatus === "Checking..." ? "bg-blue-50 text-blue-600" :
                "bg-rose-50 text-rose-600"
              }\`}>
                {aiStatus}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Upload PDF scans of printed POs or photos of handwritten delivery checklists. The in-app AP assistant will extract core numbers, quantities, condition statuses, and signatures.
            {aiErrorMsg && <span className="block mt-1 text-rose-600">Diagnostics: {aiErrorMsg}</span>}
          </p>`);

code = code.replace(
`<div
            onClick={() => scanInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl p-8 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={scanInputRef}
              onChange={handleDocScanUpload}
              accept="image/*, application/pdf"
              className="hidden"
              multiple
            />`,
`<div
            onClick={() => aiStatus === "Connected" && scanInputRef.current?.click()}
            className={\`border-2 border-dashed rounded-xl p-8 text-center transition \${aiStatus === "Connected" ? "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer" : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-70"}\`}
          >
            <input
              type="file"
              ref={scanInputRef}
              onChange={handleDocScanUpload}
              accept="image/*, application/pdf"
              className="hidden"
              multiple
              disabled={aiStatus !== "Connected"}
            />`);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
