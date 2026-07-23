const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

const regex = /<form onSubmit=\{handleSaveReview\}[\s\S]*?<\/form>/;

const newForm = `<form onSubmit={handleSaveReview} className="border border-indigo-100 bg-indigo-50/10 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5">
                    <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" />
                    <span>Accounts AP Override & Audit Log Sign-Off</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    If this is a valid exception that was solved manually, or you require placing this invoice on temporary hold pending a credit note, enter your resolution decision and comments here.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedLine.exceptions?.some(e => e.type.includes("Duplicate Warning")) ? (
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
                    ) : (
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
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Reviewer Full Name *</label>
                      <input
                        type="text"
                        required
                        value={reviewerName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="Enter your first and last name"
                        className="w-full text-xs border border-indigo-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  {selectedLine.exceptions?.some(e => e.type.includes("Duplicate Warning")) && duplicateReviewDecision === "Confirmed Duplicate" && (
                    <div>
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

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Resolution Audit Comments *</label>
                    <textarea
                      rows={3}
                      required
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="List why this discrepancy is cleared or kept on hold."
                      className="w-full text-xs border border-indigo-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      Sign & Apply Override
                    </button>
                  </div>
                </form>`;

code = code.replace(regex, newForm);

// Also need to fix setReviewName to setReviewerName in my snippet above.
code = code.replace(/setReviewName/g, "setReviewerName");

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3-form");
