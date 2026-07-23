const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

const startIndex = code.indexOf('{/* Visual Mismatch Alert Header */}');
const endIndex = code.indexOf('{/* 3-Column Document Board */}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{\/\* Visual Mismatch Alert Header \*\/}
                {selectedLine.overallStatus === "Awaiting Department Approval" || selectedLine.overallStatus?.includes("Matched") ? (
                  <div className="border p-5 rounded-2xl text-xs space-y-4 border-emerald-200 bg-emerald-50/30">
                    <div className="font-bold flex items-center space-x-1.5 text-sm text-emerald-900">
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                      <span>Matching Successful: Awaiting Department Approval</span>
                    </div>
                    <div className="text-emerald-800">
                      Invoice matches PO and GRN details perfectly. No discrepancies found.
                    </div>
                  </div>
                ) : (
                  <div className={\`border p-5 rounded-2xl text-xs space-y-4 \${
                    selectedLine.overallStatus === "Review Required"
                      ? "border-amber-200 bg-amber-50/30"
                      : "border-red-100 bg-red-50/30"
                  }\`}>
                    <div className={\`font-bold flex items-center space-x-1.5 text-sm \${
                      selectedLine.overallStatus === "Review Required"
                        ? "text-amber-900"
                        : "text-red-900"
                    }\`}>
                      {selectedLine.overallStatus === "Review Required" ? (
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                      ) : (
                        <AlertOctagon className="h-4.5 w-4.5 shrink-0 text-red-600" />
                      )}
                      <span>Matching Discrepancy Flagged: {selectedLine.overallStatus}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedLine.exceptions && selectedLine.exceptions.length > 0 ? (
                        selectedLine.exceptions.map((exc, excIdx) => (
                          <div key={excIdx} className={\`bg-white/80 p-3 rounded-lg border space-y-1.5 shadow-2xs \${
                            selectedLine.overallStatus === "Review Required"
                              ? "border-amber-100/60"
                              : "border-red-100/60"
                          }\`}>
                            <div className="flex items-center justify-between">
                              <span className={\`font-bold \${
                                selectedLine.overallStatus === "Review Required"
                                  ? "text-amber-800"
                                  : "text-red-800"
                              }\`}>{excIdx + 1}. {exc.type}</span>
                              <span className={\`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded \${
                                selectedLine.overallStatus === "Review Required"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }\`}>
                                {exc.severity}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed font-medium">{exc.reason}</p>
                            
                            <div className={\`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 text-[10px] border-t \${
                              selectedLine.overallStatus === "Review Required"
                                ? "border-amber-50"
                                : "border-red-50/50"
                            }\`}>
                              {exc.numericalDifference && (
                                <div>
                                  <strong className="text-gray-500 font-sans">Numerical Difference: </strong>
                                  <span className={\`font-mono font-semibold \${
                                    selectedLine.overallStatus === "Review Required"
                                      ? "text-amber-700"
                                      : "text-red-700"
                                  }\`}>{exc.numericalDifference}</span>
                                </div>
                              )}
                              {exc.requiredAction && (
                                <div className="sm:col-span-2 font-sans">
                                  <strong className="text-gray-500 font-sans">Required Action: </strong>
                                  <span className="text-gray-700">{exc.requiredAction}</span>
                                </div>
                              )}
                              <div>
                                <strong className="text-gray-500 font-sans">Suggested Party: </strong>
                                <span className="text-gray-600">{exc.suggestedFollowupParty}</span>
                              </div>
                              <div>
                                <strong className="text-gray-500 font-sans">Follow-up Status: </strong>
                                <span className="text-gray-600">{exc.followupStatus}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={\`bg-white/80 p-3 rounded-lg border space-y-1 \${
                          selectedLine.overallStatus === "Review Required"
                            ? "border-amber-100/60"
                            : "border-red-100/60"
                        }\`}>
                          <div className={\`font-bold \${
                            selectedLine.overallStatus === "Review Required"
                              ? "text-amber-800"
                              : "text-red-800"
                          }\`}>
                            {selectedLine.exceptionType === "None" ? "No discrepancies" : selectedLine.exceptionType}
                          </div>
                          <div className="text-gray-700 leading-relaxed">{selectedLine.reason}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                `;
  
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find boundaries!");
}
