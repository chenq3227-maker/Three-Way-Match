const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

const candidateRenderSrc = `
                {/* Candidate Record */}
                <div className="border border-rose-200 rounded-xl overflow-hidden shadow-sm bg-rose-50/10">
                  <div className="bg-rose-50 border-b border-rose-200 p-3 text-center">
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Candidate / Original Record</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {(() => {
                      const candidate = invoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId) || 
                                        historicalInvoices.find(i => i.recordId === selectedLine.duplicateCandidateRecordId) || 
                                        selectedLine;
                      
                      const diffClass = (val1: any, val2: any) => val1 !== val2 ? "bg-yellow-100 text-yellow-900 font-bold px-1 rounded" : "text-gray-900";
                      
                      return (
                        <>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Record ID</div>
                            <div className="col-span-2 font-medium text-right"><span className={diffClass(selectedLine.recordId, candidate.recordId)}>{candidate.recordId || "N/A"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Supplier</div>
                            <div className="col-span-2 font-medium text-right"><span className={diffClass(selectedLine.supplierName, candidate.supplierName)}>{candidate.supplierName || "N/A"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Invoice Number</div>
                            <div className="col-span-2 text-right"><span className={\`font-bold \${diffClass(selectedLine.invoiceNumber, candidate.invoiceNumber)}\`}>{candidate.invoiceNumber || "N/A"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Source File</div>
                            <div className="col-span-2 font-medium text-right truncate" title={candidate.sourceFileName}><span className={diffClass(selectedLine.sourceFileName, candidate.sourceFileName)}>{candidate.sourceFileName || "Historical Database"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">PO Number</div>
                            <div className="col-span-2 font-medium text-right"><span className={diffClass(selectedLine.poNumber, candidate.poNumber)}>{candidate.poNumber || "N/A"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Invoice Date</div>
                            <div className="col-span-2 font-medium text-right"><span className={diffClass(selectedLine.invoiceDate, candidate.invoiceDate)}>{candidate.invoiceDate || "N/A"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Item</div>
                            <div className="col-span-2 font-medium text-right truncate" title={candidate.itemDescription}><span className={diffClass(selectedLine.itemDescription, candidate.itemDescription)}>{candidate.itemDescription || "N/A"}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                            <div className="font-semibold text-gray-500">Qty x Price</div>
                            <div className="col-span-2 font-medium text-right"><span className={diffClass(selectedLine.quantityInvoiced + "_" + selectedLine.unitPrice, candidate.quantityInvoiced + "_" + candidate.unitPrice)}>{candidate.quantityInvoiced} x {candidate.currency} {candidate.unitPrice?.toFixed(2)}</span></div>
                          </div>
                          <div className="grid grid-cols-3 text-xs pt-1">
                            <div className="font-bold text-gray-900">Invoice Total</div>
                            <div className="col-span-2 font-bold text-right"><span className={diffClass(selectedLine.invoiceTotal, candidate.invoiceTotal)}>{candidate.currency} {candidate.invoiceTotal?.toFixed(2)}</span></div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>`;

const regex = /\{\/\* Candidate Record \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>/s;
code = code.replace(regex, candidateRenderSrc + "\n              </div>");

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3 candidate");
