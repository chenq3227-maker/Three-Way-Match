const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `                {selectedLine.humanReview && (
                  <div className="border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-indigo-900">Current Overridden Status Details</div>
                    <p className="text-indigo-800 italic">" {selectedLine.humanReview.notes} "</p>
                    <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-between">
                      <span>Verifier: {selectedLine.humanReview.reviewerName}</span>
                      <span>Verified At: {selectedLine.humanReview.timestamp}</span>
                    </div>
                  </div>
                )}`,
  `                {selectedLine.humanReview && (
                  <div className="border border-indigo-100 bg-indigo-50/20 p-4 rounded-xl text-xs space-y-1 mb-2">
                    <div className="font-bold text-indigo-900">Current Overridden Status Details</div>
                    <p className="text-indigo-800 italic">" {selectedLine.humanReview.notes} "</p>
                    <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-between">
                      <span>Verifier: {selectedLine.humanReview.reviewerName}</span>
                      <span>Verified At: {selectedLine.humanReview.timestamp}</span>
                    </div>
                  </div>
                )}
                {selectedLine.duplicateReviewDecision && selectedLine.duplicateReviewDecision !== "Pending Investigation" && (
                  <div className="border border-rose-100 bg-rose-50/20 p-4 rounded-xl text-xs space-y-1 mb-2">
                    <div className="font-bold text-rose-900">Duplicate Resolution: {selectedLine.duplicateReviewDecision}</div>
                    <p className="text-rose-800 italic">" {selectedLine.duplicateReviewNotes} "</p>
                    <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-between">
                      <span>Verifier: {selectedLine.duplicateReviewerName}</span>
                      {selectedLine.duplicateIdentifiedOriginalId && <span>Original Record: {selectedLine.duplicateIdentifiedOriginalId}</span>}
                    </div>
                  </div>
                )}`
);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3 audit");
