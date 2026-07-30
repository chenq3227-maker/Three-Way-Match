import { getFormattedTimestamp } from "./lib/timestamp";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FileSpreadsheet, ShieldCheck, FileCheck2, Settings, ArrowRight } from "lucide-react";
import { InvoiceLine, POLine, GRNLine, ColumnMapping, DateStandardisationRecord } from "./types";
import Step1InvoiceRegister from "./components/Step1InvoiceRegister";
import Step2POGRNInput from "./components/Step2POGRNInput";
import Step3MatchingDashboard from "./components/Step3MatchingDashboard";
import { runThreeWayMatch } from "./lib/matchingEngine";
import { standardiseAllCollections } from "./lib/dateStandardiser";


function getRawInvoicesString(invList: InvoiceLine[]): string {
  return JSON.stringify(
    invList.map((inv) => ({
      recordId: inv.recordId,
      sourceFileName: inv.sourceFileName,
      supplierName: inv.supplierName,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      invoiceDueDate: inv.invoiceDueDate,
      billTo: inv.billTo,
      poNumber: inv.poNumber,
      lineNumber: inv.lineNumber,
      itemDescription: inv.itemDescription,
      quantityInvoiced: inv.quantityInvoiced,
      unitPrice: inv.unitPrice,
      lineAmount: inv.lineAmount,
      subtotal: inv.subtotal,
      gst: inv.gst,
      invoiceTotal: inv.invoiceTotal,
      currency: inv.currency,
      extractionStatus: inv.extractionStatus,
      fieldsRequiringReview: inv.fieldsRequiringReview,
      extractionNotes: inv.extractionNotes,
    }))
  );
}

function getRawPOsString(poList: POLine[]): string {
  return JSON.stringify(
    poList.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      poDate: po.poDate,
      supplier: po.supplier,
      itemDescription: po.itemDescription,
      quantityOrdered: po.quantityOrdered,
      unitPrice: po.unitPrice,
      totalAmount: po.totalAmount,
      expectedDelivery: po.expectedDelivery,
      sourceFileName: po.sourceFileName,
    }))
  );
}

function getRawGRNsString(grnList: GRNLine[]): string {
  return JSON.stringify(
    grnList.map((grn) => ({
      id: grn.id,
      grnNumber: grn.grnNumber,
      grnDate: grn.grnDate,
      poNumber: grn.poNumber,
      supplier: grn.supplier,
      itemDescription: grn.itemDescription,
      quantityReceived: grn.quantityReceived,
      condition: grn.condition,
      receivedBy: grn.receivedBy,
      sourceFileName: grn.sourceFileName,
    }))
  );
}

export default function App() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [invoices, setInvoices] = useState<InvoiceLine[]>([]);
  const [historicalInvoices, setHistoricalInvoices] = useState<InvoiceLine[]>([]);
  const [poLines, setPoLines] = useState<POLine[]>([]);
  const [grnLines, setGrnLines] = useState<GRNLine[]>([]);
  const [invoiceFileName, setInvoiceFileName] = useState<string>("");

  // App 1 Multi-Sheet States
  const [sheetsData, setSheetsData] = useState<any>(null);
  const [summaryMappings, setSummaryMappings] = useState<ColumnMapping[]>([]);
  const [granularMappings, setGranularMappings] = useState<ColumnMapping[]>([]);
  const [isApp1Format, setIsApp1Format] = useState<boolean>(false);
  const [mappingChangeHistory, setMappingChangeHistory] = useState<any[]>([]);
  const [isRematchRequired, setIsRematchRequired] = useState<boolean>(false);

  // Date Standardisation state
  const [dateStandardisations, setDateStandardisations] = useState<DateStandardisationRecord[]>([]);
  const [excelDate1904, setExcelDate1904] = useState<boolean>(false);

  // Matched datasets snapshots to track if inputs have changed
  const [lastMatchInvoices, setLastMatchInvoices] = useState<string>("");
  const [lastMatchPOs, setLastMatchPOs] = useState<string>("");
  const [lastMatchGRNs, setLastMatchGRNs] = useState<string>("");

  // Determine if current results are outdated based on raw input differences or missing exceptions collection
  const isOutdated = 
    lastMatchInvoices !== "" && (
      lastMatchInvoices !== getRawInvoicesString(invoices) ||
      lastMatchPOs !== getRawPOsString(poLines) ||
      lastMatchGRNs !== getRawGRNsString(grnLines) ||
      invoices.some((inv) => !inv.exceptions || inv.exceptions.length === 0 && inv.overallStatus !== "Matched – Awaiting Department Approval")
    );

  // Mark currently loaded batch as stale and display "Re-upload Required" if they don't match the updated parser
  const isDateParserStale = React.useMemo(() => {
    const hasInvoices = invoices.length > 0;
    const hasPOs = poLines.length > 0;
    const hasGRNs = grnLines.length > 0;
    if (!hasInvoices && !hasPOs && !hasGRNs) return false;

    const invoicesAllV2 = !hasInvoices || invoices.every(inv => inv.dateParserVersion === "v2-date-only");
    const posAllV2 = !hasPOs || poLines.every(po => po.dateParserVersion === "v2-date-only");
    const grnsAllV2 = !hasGRNs || grnLines.every(grn => grn.dateParserVersion === "v2-date-only");

    return !invoicesAllV2 || !posAllV2 || !grnsAllV2;
  }, [invoices, poLines, grnLines]);

  // ----------------------------------------------------------------------
  // State Handlers
  // ----------------------------------------------------------------------
  const handleInvoicesLoaded = (lines: InvoiceLine[], fileName: string) => {
    const sMap = isApp1Format ? summaryMappings : [];
    const res = standardiseAllCollections(lines, poLines, grnLines, dateStandardisations, sMap, excelDate1904);
    setInvoices(res.invoices);
    setDateStandardisations(res.dateStandardisations);
    setInvoiceFileName(fileName);
    setActiveStep(2); // Auto-advance to Step 2
  };

  const handleDataConfirmed = (pos: POLine[], grns: GRNLine[]) => {
    // Automatically standardise dates from Invoice, PO, and GRN information
    const sMap = isApp1Format ? summaryMappings : [];
    const res = standardiseAllCollections(invoices, pos, grns, dateStandardisations, sMap, excelDate1904);

    setPoLines(res.poLines);
    setGrnLines(res.grnLines);
    setDateStandardisations(res.dateStandardisations);

    // Execute the three-way match calculation immediately using the standardised values
    const matchedResults = runThreeWayMatch(res.invoices, res.poLines, res.grnLines, summaryMappings, granularMappings, historicalInvoices);
    setInvoices(matchedResults);

    // Save snapshot of matched inputs
    setLastMatchInvoices(getRawInvoicesString(matchedResults));
    setLastMatchPOs(getRawPOsString(res.poLines));
    setLastMatchGRNs(getRawGRNsString(res.grnLines));

    setActiveStep(3); // Advance to Step 3 Review Dashboard
  };

  const handleUpdateInvoices = (updatedInvoices: InvoiceLine[]) => {
    setInvoices(updatedInvoices);
  };

  const handleRefreshMatch = () => {
    if (isDateParserStale) return;
    const refreshed = runThreeWayMatch(invoices, poLines, grnLines, summaryMappings, granularMappings, historicalInvoices);
    
    // Compare previous system results and append change info to the audit log
    const finalized = refreshed.map((newLine) => {
      const prevLine = invoices.find((inv) => inv.recordId === newLine.recordId);
      if (prevLine) {
        const statusChanged = prevLine.overallStatus !== newLine.overallStatus || 
                              prevLine.exceptionType !== newLine.exceptionType ||
                              prevLine.reason !== newLine.reason;
        
        const existingAuditLog = prevLine.auditLog || [];
        let updatedAuditLog = [...existingAuditLog];

        // Capture any recent mapping adjustment logs
        const lastAuditLogTime = existingAuditLog.length > 0 
          ? new Date(existingAuditLog[existingAuditLog.length - 1].timestamp).getTime()
          : 0;

        const newMappingLogs = mappingChangeHistory.filter(h => {
          const hTime = new Date(h.timestamp).getTime();
          return hTime > lastAuditLogTime;
        });

        if (newMappingLogs.length > 0) {
          newMappingLogs.forEach(log => {
            updatedAuditLog.push({
              timestamp: log.timestamp,
              previousStatus: prevLine.overallStatus || "Unmatched",
              updatedStatus: newLine.overallStatus || "Unmatched",
              reason: `Column Mapping Adjusted: Column "${log.originalColumn}" mapping changed to "${log.newMappedField || "None"}" by ${log.changedBy}. Type: ${log.type || "Mapping"}.`,
              triggerType: "rematch",
              details: `Field: ${log.type || "schema"}. Rematched status is now: ${newLine.overallStatus}.`
            });
          });
        }

        if (statusChanged && newMappingLogs.length === 0) {
          updatedAuditLog.push({
            timestamp: getFormattedTimestamp(),
            previousStatus: prevLine.overallStatus || "Unmatched",
            updatedStatus: newLine.overallStatus || "Unmatched",
            reason: `Rematch executed due to input/mapping changes. Details: ${newLine.reason || "None"}`,
            triggerType: "rematch",
            details: `Previous exception: ${prevLine.exceptionType || "None"}. New exception: ${newLine.exceptionType || "None"}.`
          });
        }

        return {
          ...newLine,
          auditLog: updatedAuditLog,
          humanReview: prevLine.humanReview
        };
      }
      return newLine;
    });

    setInvoices(finalized);
    setLastMatchInvoices(getRawInvoicesString(finalized));
    setLastMatchPOs(getRawPOsString(poLines));
    setLastMatchGRNs(getRawGRNsString(grnLines));
  };

  const handleReset = () => {
    setInvoices([]);
    setPoLines([]);
    setGrnLines([]);
    setInvoiceFileName("");
    setLastMatchInvoices("");
    setLastMatchPOs("");
    setLastMatchGRNs("");
    setActiveStep(1);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-950 flex flex-col">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex items-center justify-between shrink-0 shadow-3xs">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-md font-sans font-extrabold tracking-tight text-gray-900">
              Three-Way Matching Ledger
            </h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-wider">AP CONTROL SYSTEM</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>SECURE SYSTEM</span>
          </span>
        </div>
      </header>

      {/* CORE FRAME LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* STEP PROGRESS TRACKER */}
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-3xs flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-8 text-xs font-semibold w-full">
            <div
              className={`flex items-center space-x-2 ${
                activeStep >= 1 ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] ${
                activeStep > 1 ? "bg-indigo-100 text-indigo-700 font-bold" : activeStep === 1 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {activeStep > 1 ? "✓" : "1"}
              </span>
              <span className="hidden sm:inline">1. Invoice Register</span>
            </div>

            <div className="h-px bg-gray-200 flex-1 max-w-[80px]" />

            <div
              className={`flex items-center space-x-2 ${
                activeStep >= 2 ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] ${
                activeStep > 2 ? "bg-indigo-100 text-indigo-700 font-bold" : activeStep === 2 ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {activeStep > 2 ? "✓" : "2"}
              </span>
              <span className="hidden sm:inline">2. Purchase Order & Receipt Pool</span>
            </div>

            <div className="h-px bg-gray-200 flex-1 max-w-[80px]" />

            <div
              className={`flex items-center space-x-2 ${
                activeStep >= 3 ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] ${
                activeStep === 3 ? "bg-indigo-600 text-white animate-pulse" : "bg-gray-100 text-gray-500"
              }`}>
                3
              </span>
              <span className="hidden sm:inline">3. Reconciliation Dashboard</span>
            </div>
          </div>
          {activeStep === 2 && (
            <button
              onClick={() => setActiveStep(1)}
              className="text-xs text-indigo-600 font-semibold hover:underline hidden sm:block shrink-0"
            >
              ← Back to Register
            </button>
          )}
          {activeStep === 3 && (
            <button
              onClick={() => setActiveStep(2)}
              className="text-xs text-indigo-600 font-semibold hover:underline hidden sm:block shrink-0"
            >
              ← Back to POs & GRNs
            </button>
          )}
        </div>

        {/* ACTIVE VIEW PORT */}
        <div className="min-h-[400px]">
          {activeStep === 1 && (
            <Step1InvoiceRegister 
              historicalInvoices={historicalInvoices}
              setHistoricalInvoices={setHistoricalInvoices}
              onInvoicesLoaded={handleInvoicesLoaded} 
              existingInvoices={invoices} 
              onUpdateInvoices={handleUpdateInvoices}
              sheetsData={sheetsData}
              setSheetsData={setSheetsData}
              summaryMappings={summaryMappings}
              setSummaryMappings={setSummaryMappings}
              granularMappings={granularMappings}
              setGranularMappings={setGranularMappings}
              isApp1Format={isApp1Format}
              setIsApp1Format={setIsApp1Format}
              mappingChangeHistory={mappingChangeHistory}
              setMappingChangeHistory={setMappingChangeHistory}
              isRematchRequired={isRematchRequired}
              setIsRematchRequired={setIsRematchRequired}
              dateStandardisations={dateStandardisations}
              setDateStandardisations={setDateStandardisations}
              excelDate1904={excelDate1904}
              setExcelDate1904={setExcelDate1904}
              poLines={poLines}
              grnLines={grnLines}
              setPoLines={setPoLines}
              setGrnLines={setGrnLines}
            />
          )}

          {activeStep === 2 && (
            <Step2POGRNInput
              poLines={poLines}
              grnLines={grnLines}
              onDataConfirmed={handleDataConfirmed}
              onBack={() => setActiveStep(1)}
            />
          )}

          {activeStep === 3 && (
            <Step3MatchingDashboard
              invoices={invoices}
              historicalInvoices={historicalInvoices}
              poLines={poLines}
              grnLines={grnLines}
              onUpdateInvoices={handleUpdateInvoices}
              onReset={handleReset}
              onGoBackToStep={setActiveStep}
              onRefresh={handleRefreshMatch}
              isOutdated={isOutdated}
              onRunRematch={handleRefreshMatch}
              isDateParserStale={isDateParserStale}
            />
          )}
        </div>
      </main>

      {/* FOOTER AUDIT NOTES */}
      <footer className="bg-white border-t border-gray-100 py-5 text-center text-[10px] text-gray-400 font-mono tracking-wider uppercase shrink-0 mt-auto">
        SECURE AP AUDIT SYSTEM • REVISION 2.0 • INTELLECTUAL PROPERTY OF GLOBAL CORP
      </footer>
    </div>
  );
}
