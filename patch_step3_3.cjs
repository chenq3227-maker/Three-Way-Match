const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Override Match Status *</label>
                      <select
                        value={reviewDecision}
                        onChange={(e) => setReviewDecision(e.target.value as any)}
                        className="w-full text-xs border border-indigo-200 bg-white rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Pending Investigation">Pending Investigation (Review Required)</option>
                        <option value="Keep on Hold">Keep on Hold (On Hold)</option>
                        <option value="Resolved – Send for Department Approval">Resolved – Send for Department Approval</option>
                      </select>
                    </div>`,
  `                  {selectedLine.exceptions?.some(e => e.type.includes("Duplicate Warning")) ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Duplicate Verification *</label>
                        <select
                          value={duplicateReviewDecision}
                          onChange={(e) => setDuplicateReviewDecision(e.target.value as any)}
                          className="w-full text-xs border border-indigo-200 bg-white rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Pending Investigation">Pending Investigation</option>
                          <option value="Confirmed Duplicate">Confirmed Duplicate</option>
                          <option value="Not a Duplicate">Not a Duplicate</option>
                        </select>
                      </div>
                      {duplicateReviewDecision === "Confirmed Duplicate" && (
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Original Invoice Record ID *</label>
                          <input
                            type="text"
                            required
                            value={duplicateIdentifiedOriginalId}
                            onChange={(e) => setDuplicateIdentifiedOriginalId(e.target.value)}
                            placeholder="Enter the Record ID of the true original invoice"
                            className="w-full text-xs border border-indigo-200 bg-white rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Override Match Status *</label>
                        <select
                          value={reviewDecision}
                          onChange={(e) => setReviewDecision(e.target.value as any)}
                          className="w-full text-xs border border-indigo-200 bg-white rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Pending Investigation">Pending Investigation (Review Required)</option>
                          <option value="Keep on Hold">Keep on Hold (On Hold)</option>
                          <option value="Resolved – Send for Department Approval">Resolved – Send for Department Approval</option>
                        </select>
                      </div>
                  )}`
);

// We need to fix the ending tag of the ternary. The original had:
// <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
// ...
// </div> 
// which is followed by the reviewername input.

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3-3");
