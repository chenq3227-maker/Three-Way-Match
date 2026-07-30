import { getFormattedTimestamp } from "../lib/timestamp";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  FileSpreadsheet, Download, RefreshCw, Filter, Search, ShieldCheck, 
  AlertOctagon, AlertTriangle, CheckCircle2, Ban, Eye, ArrowLeft, ArrowUpRight, Check, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InvoiceLine, POLine, GRNLine, MatchSummary } from "../types";
import { exportMatchingResults } from "../lib/excelExporter";
import { normalizeText, isDescriptionMatch } from "../lib/matchingEngine";
import { formatStoredDateForDisplay } from "../lib/excelParser";

interface Props {
  invoices: InvoiceLine[];
  historicalInvoices?: InvoiceLine[];
  poLines: POLine[];
  grnLines: GRNLine[];
  onUpdateInvoices: (updated: InvoiceLine[]) => void;
  onReset: () => void;
  onGoBackToStep?: (step: number) => void;
  onRefresh?: () => void;
  isOutdated?: boolean;
  onRunRematch?: () => void;
  isDateParserStale?: boolean;
}

export default function Step3MatchingDashboard({ 
  invoices, 
  historicalInvoices = [],
  poLines, 
  grnLines, 
  onUpdateInvoices, 
  onReset,
  onGoBackToStep,
  onRefresh,
  isOutdated = false,
  onRunRematch,
  isDateParserStale = false
}: Props) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [exceptionFilter, setExceptionFilter] = useState<string>("All");
  const [followupFilter, setFollowupFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("recordId");

  // Detailed view drawer modal
  const [selectedLine, setSelectedLine] = useState<InvoiceLine | null>(null);

  // Human Review Form States
  const [reviewerName, setReviewerName] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDecision, setReviewDecision] = useState<
    "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval"
  >("Pending Investigation");
  const [duplicateReviewDecision, setDuplicateReviewDecision] = useState<any>("Pending Investigation");
  const [duplicateIdentifiedOriginalId, setDuplicateIdentifiedOriginalId] = useState("");
  const [showDuplicateCompareModal, setShowDuplicateCompareModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // KPI Metrics Calculation
  // ----------------------------------------------------------------------
  const metrics = useMemo((): MatchSummary => {
    let totalVal = 0;
    let totalOnHoldVal = 0;
    let matchedCount = 0;
    let reviewCount = 0;
    let onHoldCount = 0;

    // Track unique invoices to get total invoice values accurately
    const uniqueInvoiceTotals = new Map<string, number>();
    const uniqueInvoicesOnHold = new Map<string, number>();

    invoices.forEach((line) => {
      uniqueInvoiceTotals.set(line.invoiceNumber, line.invoiceTotal);
      if (line.overallStatus === "On Hold") {
        uniqueInvoicesOnHold.set(line.invoiceNumber, line.invoiceTotal);
      }

      if (line.overallStatus === "Matched – Awaiting Department Approval" ) {
        matchedCount++;
      } else if (line.overallStatus === "Review Required") {
        reviewCount++;
      } else if (line.overallStatus === "On Hold") {
        onHoldCount++;
      }
    });

    uniqueInvoiceTotals.forEach((val) => { totalVal += val; });
    uniqueInvoicesOnHold.forEach((val) => { totalOnHoldVal += val; });

    return {
      totalInvoices: uniqueInvoiceTotals.size,
      totalInvoiceLines: invoices.length,
      matched: matchedCount,
      reviewRequired: reviewCount,
      onHold: onHoldCount,
      totalInvoiceValue: totalVal,
      totalValueOnHold: totalOnHoldVal,
    };
  }, [invoices]);

  // Unique list of options for filters
  const uniqueExceptions = useMemo(() => {
    return Array.from(new Set(invoices.map((inv) => inv.exceptionType).filter(Boolean)));
  }, [invoices]);

  const uniqueFollowupParties = useMemo(() => {
    return Array.from(new Set(invoices.map((inv) => inv.suggestedFollowupParty).filter(Boolean)));
  }, [invoices]);

  // ----------------------------------------------------------------------
  // Filtering & Sorting
  // ----------------------------------------------------------------------
  const filteredLines = useMemo(() => {
    return invoices
      .filter((line) => {
        const matchesSearch = 
          line.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.itemDescription.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = 
          statusFilter === "All" ||
          (statusFilter === "Review Required Only" && line.overallStatus === "Review Required") ||
          (statusFilter === "On Hold Only" && line.overallStatus === "On Hold") ||
          (statusFilter === "Review Required + On Hold" && (line.overallStatus === "Review Required" || line.overallStatus === "On Hold"));

        const matchesException = 
          exceptionFilter === "All" || 
          line.exceptionType === exceptionFilter;

        const matchesFollowup = 
          followupFilter === "All" || 
          line.suggestedFollowupParty === followupFilter;

        return matchesSearch && matchesStatus && matchesException && matchesFollowup;
      })
      .sort((a, b) => {
        if (sortBy === "recordId") return a.recordId.localeCompare(b.recordId);
        if (sortBy === "supplier") return a.supplierName.localeCompare(b.supplierName);
        if (sortBy === "invoiceTotal") return b.invoiceTotal - a.invoiceTotal;
        if (sortBy === "status") return (a.overallStatus || "").localeCompare(b.overallStatus || "");
        return 0;
      });
  }, [invoices, searchTerm, statusFilter, exceptionFilter, followupFilter, sortBy]);

  // ----------------------------------------------------------------------
  // Related Document Loaders for Comparison
  // ----------------------------------------------------------------------
  const comparisonDocs = useMemo(() => {
    if (!selectedLine) return null;

    const matchedPOs = poLines.filter(
      (po) => normalizeText(po.poNumber) === normalizeText(selectedLine.poNumber)
    );

    let matchedPO = matchedPOs.find(
      (po) => String(po.itemDescription).trim() === String(selectedLine.itemDescription).trim()
    );
    if (!matchedPO) {
      matchedPO = matchedPOs.find((po) => isDescriptionMatch(po.itemDescription, selectedLine.itemDescription));
    }

    const matchedGRNs = grnLines.filter(
      (grn) => normalizeText(grn.poNumber) === normalizeText(selectedLine.poNumber)
    );

    let itemGRNs = matchedGRNs.filter(
      (grn) => String(grn.itemDescription).trim() === String(selectedLine.itemDescription).trim()
    );
    if (itemGRNs.length === 0) {
      itemGRNs = matchedGRNs.filter((grn) => isDescriptionMatch(grn.itemDescription, selectedLine.itemDescription));
    }

    return {
      po: matchedPO || null,
      grns: itemGRNs,
    };
  }, [selectedLine, poLines, grnLines]);

  // ----------------------------------------------------------------------
  // Human Resolution Override Forms
  // ----------------------------------------------------------------------
  const handleOpenReview = (line: InvoiceLine) => {
    setSelectedLine(line);
    setReviewerName(line.humanReview?.reviewerName || line.duplicateReviewerName || "");
    setReviewNotes(line.humanReview?.notes || line.duplicateReviewNotes || "");
    setReviewDecision(line.humanReview?.reviewDecision || "Pending Investigation");
    setDuplicateReviewDecision(line.duplicateReviewDecision || "Pending Investigation");
    setDuplicateIdentifiedOriginalId(line.duplicateIdentifiedOriginalId || "");
    setFormError(null);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    const isDuplicateException = selectedLine?.exceptions?.some(e => e.type.includes("Duplicate Warning"));
    const isResolving = isDuplicateException ? (duplicateReviewDecision === "Confirmed Duplicate" || duplicateReviewDecision === "Not a Duplicate") : reviewDecision === "Resolved – Send for Department Approval";
    
    if (isDuplicateException && duplicateReviewDecision === "Confirmed Duplicate" && !duplicateIdentifiedOriginalId) {
      setFormError("For a confirmed duplicate, you must identify the original invoice Record ID.");
      return;
    }
    if (isResolving) {
      if (!reviewerName.trim()) {
        setFormError("Reviewer full name is mandatory before an exception can be marked resolved.");
        return;
      }
      if (!reviewNotes.trim()) {
        setFormError("Review audit notes and comments are required before an exception can be marked resolved.");
        return;
      }
    }

    const timestamp = getFormattedTimestamp();
    const updatedInvoices = invoices.map((inv) => {
      // If multi-line, update other lines of the same invoice as well to ensure roll-up consistency
      if (inv.invoiceNumber === selectedLine?.invoiceNumber) {
        let newStatus = inv.overallStatus;
        let finalReviewDecision = reviewDecision;
        
        if (isDuplicateException) {
          if (inv.recordId === selectedLine.recordId) {
             if (duplicateReviewDecision === "Confirmed Duplicate") {
                newStatus = "On Hold";
             } else if (duplicateReviewDecision === "Not a Duplicate") {
                // If not a duplicate, we should restore it to Review Required, and maybe it will pass on next rematch, 
                // but the instructions say "restore the result produced by the three-way match". We can set it to Awaiting Department Approval if no other errors, 
                // but the matching engine sets the default. We can flag duplicateReviewDecision to "Not a Duplicate" and let rematch handle it if we rematch.
                // But this form just updates it directly. Let's set it to "Matched – Awaiting Department Approval" temporarily if there are no other exceptions.
                const otherExceptions = (inv.exceptions || []).filter(e => !e.type.includes("Duplicate Warning"));
                newStatus = otherExceptions.length > 0 ? (otherExceptions.some(e => e.severity === "On Hold") ? "On Hold" : "Review Required") : "Matched – Awaiting Department Approval";
             } else {
                newStatus = "Review Required";
             }
          }
          return {
            ...inv,
            overallStatus: newStatus,
            duplicateReviewDecision,
            duplicateReviewNotes: reviewNotes,
            duplicateReviewerName: reviewerName,
            duplicateIdentifiedOriginalId: duplicateIdentifiedOriginalId
          };
        } else {
          if (inv.recordId === selectedLine.recordId) {
            newStatus = reviewDecision === "Resolved – Send for Department Approval"
              ? "Matched – Awaiting Department Approval"
              : reviewDecision === "Keep on Hold"
              ? "On Hold"
              : "Review Required";
          }
          return {
            ...inv,
            overallStatus: newStatus,
            followupStatus: reviewDecision,
            humanReview: {
              reviewerName,
              reviewDecision,
              notes: reviewNotes,
              timestamp,
            },
          };
        }
      }
      return inv;
    });

    onUpdateInvoices(updatedInvoices);
    setSelectedLine(null);
  };

  const [exportError, setExportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = () => {
    setExportError(null);
    exportMatchingResults(invoices, poLines, grnLines);
  };

  return (
    <div id="matching-dashboard-container" className="space-y-6">
      {/* STEPS BACK NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-3xs gap-3">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onGoBackToStep?.(1)}
            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-100 bg-white hover:bg-indigo-50/20 px-3 py-2 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Edit Invoice Data and Mapping</span>
          </button>
          <button
            onClick={() => onGoBackToStep?.(2)}
            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 border border-gray-200 hover:border-indigo-100 bg-white hover:bg-indigo-50/20 px-3 py-2 rounded-lg transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Edit POs & GRNs (Step 2)</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={isDateParserStale ? undefined : onRefresh}
            disabled={isDateParserStale}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg shadow-3xs transition-all ${
              isDateParserStale 
                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" 
                : "text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 cursor-pointer"
            }`}
            title={isDateParserStale ? "Please re-upload source documents" : "Recheck and refresh matches on current invoices, POs, and GRNs"}
          >
            <RefreshCw className="h-4 w-4 animate-spin-hover" />
            <span>Refresh Match Results</span>
          </button>
        </div>
      </div>

      {isDateParserStale ? (
        <div className="bg-red-50 border border-red-200/80 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-3xs">
          <div className="flex items-start space-x-3">
            <div className="bg-red-100 text-red-800 p-2 rounded-lg shrink-0 mt-0.5 md:mt-0">
              <AlertOctagon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900">Re-upload Required</h4>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                The core date processing pipeline has been updated to support strict calendar-day precision. 
                The currently loaded batch is stale and cannot be matched. You must go back and re-upload your source documents.
              </p>
            </div>
          </div>
          <button
            onClick={() => onGoBackToStep?.(1)}
            className="flex items-center justify-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <span>Go to Step 1 & Re-upload</span>
          </button>
        </div>
      ) : isOutdated ? (
        <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-3xs">
          <div className="flex items-start space-x-3">
            <div className="bg-orange-100 text-orange-800 p-2 rounded-lg shrink-0 mt-0.5 md:mt-0">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-orange-900">Outdated – Rematch Required</h4>
              <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
                You have updated inputs, loaded new files, or corrected mappings since the last matching run. Existing match results are now outdated. Please run the match again to ensure internal control compliance.
              </p>
            </div>
          </div>
          <button
            onClick={onRunRematch}
            className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Run Three-Way Match Again</span>
          </button>
        </div>
      ) : null}

      {/* KPI METRICS CARD GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Lines</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalInvoiceLines}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Matched</div>
          <div className="text-2xl font-bold text-green-600 mt-1 flex items-center justify-center space-x-1">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{metrics.matched}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Needs Review</div>
          <div className="text-2xl font-bold text-orange-600 mt-1 flex items-center justify-center space-x-1">
            <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
            <span>{metrics.reviewRequired}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">On Hold</div>
          <div className="text-2xl font-bold text-red-600 mt-1 flex items-center justify-center space-x-1">
            <Ban className="h-5 w-5 shrink-0" />
            <span>{metrics.onHold}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs text-center col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Value</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1.5">${metrics.totalInvoiceValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-3xs text-center col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="text-xs font-semibold text-red-500 uppercase tracking-wider">Value on Hold</div>
          <div className="text-xl font-extrabold text-red-700 mt-1.5">${metrics.totalValueOnHold.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      {exportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-xs text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <span>{exportError}</span>
        </div>
      )}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Supplier, Invoice #, PO #, Description..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 focus:outline-none focus:border-indigo-500 text-xs rounded-lg transition"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            <button
              onClick={invoices.length === 0 ? undefined : handleExport}
              disabled={invoices.length === 0}
              className={`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition ${
                invoices.length === 0 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              }`}
              title={invoices.length === 0 ? "No matching results to export" : "Export results to Excel"}
            >
              <Download className="h-4 w-4" />
              <span>Export Audit Excel</span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Restart and Clear All Data</span>
            </button>
          </div>
        </div>

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-5 flex items-start space-x-3">
                <div className="bg-red-100 text-red-600 p-2 rounded-full shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Restart & Clear All Data</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to completely reset all loaded data files? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end space-x-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onReset();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
                >
                  Yes, Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-gray-100 pt-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Match Results</option>
              <option value="Review Required Only">Review Required Only</option>
              <option value="On Hold Only">On Hold Only</option>
              <option value="Review Required + On Hold">Review Required + On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Exception Category</label>
            <select
              value={exceptionFilter}
              onChange={(e) => setExceptionFilter(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Exceptions</option>
              {uniqueExceptions.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Follow-up Party</label>
            <select
              value={followupFilter}
              onChange={(e) => setFollowupFilter(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Follow-ups</option>
              {uniqueFollowupParties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sort Ledger By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="recordId">Record / Row ID</option>
              <option value="supplier">Supplier Name</option>
              <option value="invoiceTotal">Invoice Grand Total</option>
              <option value="status">Matching Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* LEDGER DATA TABLE */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[950px] lg:min-w-full divide-y divide-gray-100 text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">Invoice Row ID</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Invoice ID / Date</th>
                <th className="px-4 py-3">PO Reference</th>
                <th className="px-4 py-3">Total Value</th>
                <th className="px-4 py-3">Matching Status</th>
                <th className="px-4 py-3">Follow-up Party</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 italic">
                    No matching ledger rows found. Check filter metrics.
                  </td>
                </tr>
              ) : (
                filteredLines.map((line) => (
                  <tr key={line.recordId} className="hover:bg-gray-50/40">
                    <td className="px-4 py-3.5 font-medium text-gray-900">{line.recordId}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-800">{line.supplierName}</div>
                      <div className="text-[10px] text-gray-400">{line.itemDescription}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900">{line.invoiceNumber}</div>
                      <div className="text-[10px] text-gray-400">{formatStoredDateForDisplay(line.invoiceDate)}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-500">{line.poNumber}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">
                      ${line.invoiceTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                          (line.overallStatus === "Matched – Awaiting Department Approval" || line.overallStatus?.includes("Matched"))
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : line.overallStatus?.includes("Resolved")
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : line.overallStatus === "Review Required"
                            ? "bg-orange-50 text-orange-700 border border-orange-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}
                      >
                        {line.overallStatus}
                      </span>
                      {line.exceptionType && line.exceptionType !== "None" ? (
                        <div className="text-[9px] text-gray-400 mt-0.5 italic">{line.exceptionType}</div>
                      ) : line.overallStatus?.includes("Matched") ? (
                        <div className="text-[9px] text-green-600 mt-0.5 italic font-medium">No discrepancies</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 font-medium">{line.suggestedFollowupParty || "N/A"}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReview(line)}
                        className="inline-flex items-center space-x-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-indigo-600 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Compare & Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE COMPARISON DRAWER (MODAL) */}
      <AnimatePresence>
        {selectedLine && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-md font-bold text-gray-900">
                    Audit Verification Sheet: Row {selectedLine.recordId}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Side-by-side comparison. Matching fields are highlighted in green; discrepancies are colored in red.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLine(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-50 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Side-by-Side Comparison Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Visual Mismatch Alert Header */}
                {selectedLine.overallStatus === "Matched – Awaiting Department Approval" || selectedLine.overallStatus?.includes("Matched") ? (
                  <div className="border p-5 rounded-2xl text-xs space-y-4 border-green-200 bg-green-50/30">
                    <div className="font-bold flex items-center space-x-1.5 text-sm text-green-900">
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-green-600" />
                      <span>Matching Successful: Awaiting Department Approval</span>
                    </div>
                    <div className="text-green-800">
                      Invoice matches PO and GRN details perfectly. No discrepancies found.
                    </div>
                  </div>
                ) : (
                  <div className={`border p-5 rounded-2xl text-xs space-y-4 ${
                    selectedLine.overallStatus === "Review Required"
                      ? "border-orange-200 bg-orange-50/30"
                      : "border-red-100 bg-red-50/30"
                  }`}>
                    <div className={`font-bold flex items-center space-x-1.5 text-sm ${
                      selectedLine.overallStatus === "Review Required"
                        ? "text-orange-900"
                        : "text-red-900"
                    }`}>
                      {selectedLine.overallStatus === "Review Required" ? (
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-orange-600" />
                      ) : (
                        <AlertOctagon className="h-4.5 w-4.5 shrink-0 text-red-600" />
                      )}
                      <span>Matching Discrepancy Flagged: {selectedLine.overallStatus}</span>
                    </div>
                    
                    <div className="space-y-3">
                      {selectedLine.exceptions && selectedLine.exceptions.length > 0 ? (
                        selectedLine.exceptions.map((exc, excIdx) => (
                          <div key={excIdx} className={`bg-white/80 p-3 rounded-lg border space-y-1.5 shadow-2xs ${
                            selectedLine.overallStatus === "Review Required"
                              ? "border-orange-100/60"
                              : "border-red-100/60"
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-bold ${
                                selectedLine.overallStatus === "Review Required"
                                  ? "text-orange-800"
                                  : "text-red-800"
                              }`}>{excIdx + 1}. {exc.type}</span>
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                                selectedLine.overallStatus === "Review Required"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {exc.severity}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed font-medium">{exc.reason}</p>
                            
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 text-[10px] border-t ${
                              selectedLine.overallStatus === "Review Required"
                                ? "border-orange-50"
                                : "border-red-50/50"
                            }`}>
                              {exc.numericalDifference && (
                                <div>
                                  <strong className="text-gray-500 font-sans">Numerical Difference: </strong>
                                  <span className={`font-mono font-semibold ${
                                    selectedLine.overallStatus === "Review Required"
                                      ? "text-orange-700"
                                      : "text-red-700"
                                  }`}>{exc.numericalDifference}</span>
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
                        <div className={`bg-white/80 p-3 rounded-lg border space-y-1 ${
                          selectedLine.overallStatus === "Review Required"
                            ? "border-orange-100/60"
                            : "border-red-100/60"
                        }`}>
                          <div className={`font-bold ${
                            selectedLine.overallStatus === "Review Required"
                              ? "text-orange-800"
                              : "text-red-800"
                          }`}>
                            {selectedLine.exceptionType === "None" ? "No discrepancies" : selectedLine.exceptionType}
                          </div>
                          <div className="text-gray-700 leading-relaxed">{selectedLine.reason}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 3-Column Document Board */}
                {(() => {
                  const isPOMissing = !comparisonDocs?.po;
                  const isGRNMissing = !comparisonDocs?.grns || comparisonDocs.grns.length === 0;

                  // Format helpers
                  const formatMoney = (val: number) => {
                    return new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(val);
                  };

                  // Amount diff check
                  const hasAmountDiff = !isPOMissing && Math.abs(selectedLine.lineAmount - (comparisonDocs?.po?.totalAmount || 0)) >= 0.01;
                  const amountDiff = hasAmountDiff ? Math.abs(selectedLine.lineAmount - (comparisonDocs?.po?.totalAmount || 0)) : 0;
                  const amountDiffText = hasAmountDiff ? `Amount Difference: $${formatMoney(amountDiff)}` : undefined;

                  // 1. Invoice cell statuses
                  const invSupplierStatus = isPOMissing 
                    ? "missing_doc" 
                    : (normalizeText(selectedLine.supplierName) === normalizeText(comparisonDocs.po.supplier) ? "agree" : "disagree");
                  
                  const invItemStatus = isPOMissing 
                    ? "missing_doc" 
                    : (isDescriptionMatch(selectedLine.itemDescription, comparisonDocs.po.itemDescription) ? "agree" : "disagree");

                  const invQtyStatus = isPOMissing 
                    ? "missing_doc" 
                    : (selectedLine.quantityInvoiced <= comparisonDocs.po.quantityOrdered ? "agree" : "disagree");

                  const invPriceStatus = isPOMissing 
                    ? "missing_doc" 
                    : (Math.abs(selectedLine.unitPrice - comparisonDocs.po.unitPrice) < 0.01 ? "agree" : "disagree");

                  const invTotalStatus = isPOMissing 
                    ? "missing_doc" 
                    : (hasAmountDiff ? "disagree" : "agree");

                  // 2. PO cell statuses
                  const poSupplierStatus = isPOMissing 
                    ? "missing_doc" 
                    : (normalizeText(selectedLine.supplierName) === normalizeText(comparisonDocs.po.supplier) ? "agree" : "disagree");

                  const poItemStatus = isPOMissing 
                    ? "missing_doc" 
                    : (isDescriptionMatch(selectedLine.itemDescription, comparisonDocs.po.itemDescription) ? "agree" : "disagree");

                  const poQtyStatus = isPOMissing 
                    ? "missing_doc" 
                    : (selectedLine.quantityInvoiced <= comparisonDocs.po.quantityOrdered ? "agree" : "disagree");

                  const poPriceStatus = isPOMissing 
                    ? "missing_doc" 
                    : (Math.abs(selectedLine.unitPrice - comparisonDocs.po.unitPrice) < 0.01 ? "agree" : "disagree");

                  const poTotalStatus = isPOMissing 
                    ? "missing_doc" 
                    : (hasAmountDiff ? "disagree" : "agree");

                  // 3. GRN cell statuses
                  const totalRec = comparisonDocs?.grns ? comparisonDocs.grns.reduce((sum, g) => sum + g.quantityReceived, 0) : 0;
                  const isDamaged = comparisonDocs?.grns ? comparisonDocs.grns.some(g => normalizeText(g.condition) !== "good") : false;

                  const grnSupplierStatus = isGRNMissing 
                    ? "missing_doc" 
                    : (normalizeText(selectedLine.supplierName) === normalizeText(comparisonDocs.grns[0].supplier) ? "agree" : "disagree");

                  const grnItemStatus = isGRNMissing 
                    ? "missing_doc" 
                    : (isDescriptionMatch(selectedLine.itemDescription, comparisonDocs.grns[0].itemDescription) ? "agree" : "disagree");

                  const grnQtyStatus = isGRNMissing 
                    ? "missing_doc" 
                    : (selectedLine.quantityInvoiced <= totalRec ? "agree" : "disagree");

                  const grnConditionStatus = isGRNMissing 
                    ? "missing_doc" 
                    : (isDamaged ? "disagree" : "agree");

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* COLUMN 1: INVOICE */}
                      <div className="border border-gray-100 bg-gray-50/20 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">
                          1. Invoice Register Line
                        </h4>
                        
                        {renderComparisonCell(
                          "Supplier Name",
                          selectedLine.supplierName,
                          invSupplierStatus
                        )}

                        {renderComparisonCell(
                          "Invoice ID / Date",
                          `${selectedLine.invoiceNumber} (${formatStoredDateForDisplay(selectedLine.invoiceDate)})`,
                          "agree"
                        )}

                        {renderComparisonCell(
                          "Item Description",
                          selectedLine.itemDescription,
                          invItemStatus
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {renderComparisonCell(
                            "Qty Invoiced",
                            selectedLine.quantityInvoiced,
                            invQtyStatus
                          )}
                          {renderComparisonCell(
                            "Unit Price",
                            `$${formatMoney(selectedLine.unitPrice)}`,
                            invPriceStatus
                          )}
                        </div>

                        {renderComparisonCell(
                          "Line Total",
                          `$${formatMoney(selectedLine.lineAmount)}`,
                          invTotalStatus,
                          amountDiffText
                        )}

                        <div className="text-[10px] text-gray-400 pt-3 border-t border-gray-100 space-y-1">
                          <div>File: {selectedLine.sourceFile}</div>
                          <div>Duplicate Check: {selectedLine.duplicateStatus}</div>
                          <div>Extraction Status: {(!selectedLine.extractionStatus || selectedLine.extractionStatus.trim().toLowerCase() === "n/a" || selectedLine.extractionStatus.trim().toLowerCase() === "") ? "Not provided by App 1" : selectedLine.extractionStatus}</div>
                          {selectedLine.fieldsRequiringReview && (
                            <div>Fields Requiring Review: {selectedLine.fieldsRequiringReview}</div>
                          )}
                          {selectedLine.extractionNotes && (
                            <div className="mt-1.5 bg-indigo-50/50 p-2 rounded text-[10px] text-indigo-700 font-sans border border-indigo-100/50 whitespace-pre-wrap leading-relaxed">
                              <strong className="font-semibold text-indigo-900 block mb-0.5">Extraction Notes (Audit Only):</strong>
                              "{selectedLine.extractionNotes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* COLUMN 2: PURCHASE ORDER */}
                      <div className="border border-gray-100 bg-gray-50/20 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">
                          2. Purchase Order
                        </h4>
                        {!isPOMissing && comparisonDocs.po ? (
                          <>
                            {renderComparisonCell(
                              "Supplier (PO)",
                              comparisonDocs.po.supplier,
                              poSupplierStatus
                            )}

                            {renderComparisonCell(
                              "PO ID / Date",
                              `${comparisonDocs.po.poNumber} (${formatStoredDateForDisplay(comparisonDocs.po.poDate)})`,
                              "agree"
                            )}

                            {renderComparisonCell(
                              "Item Description",
                              comparisonDocs.po.itemDescription,
                              poItemStatus
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              {renderComparisonCell(
                                "Qty Ordered",
                                comparisonDocs.po.quantityOrdered,
                                poQtyStatus
                              )}
                              {renderComparisonCell(
                                "Unit Price",
                                `$${formatMoney(comparisonDocs.po.unitPrice)}`,
                                poPriceStatus
                              )}
                            </div>

                            {renderComparisonCell(
                              "Total Amount",
                              `$${formatMoney(comparisonDocs.po.totalAmount)}`,
                              poTotalStatus,
                              amountDiffText
                            )}

                            <div className="text-[10px] text-gray-400 pt-3 border-t border-gray-100">
                              <div>Expected Delivery: {comparisonDocs.po.expectedDelivery}</div>
                              <div>Method: {comparisonDocs.po.sourceType === "extracted" ? "AI Extraction" : "Excel Loading"}</div>
                              {comparisonDocs.po.verifiedRecord && (
                                <div className="text-indigo-600 font-semibold">✓ Verified By: {comparisonDocs.po.verifiedRecord.reviewerName}</div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-10 px-4 bg-orange-50/20 border border-dashed border-orange-200 text-orange-700 font-semibold rounded-xl text-xs space-y-1">
                            <AlertOctagon className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                            <div>No PO Found (PO {selectedLine.poNumber})</div>
                            <p className="text-[10px] font-normal text-orange-600/80">Purchase Order is missing in the system.</p>
                          </div>
                        )}
                      </div>

                      {/* COLUMN 3: GOODS RECEIVED NOTES */}
                      <div className="border border-gray-100 bg-gray-50/20 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100">
                          3. Goods Received Notes
                        </h4>
                        {!isGRNMissing && comparisonDocs.grns && comparisonDocs.grns.length > 0 ? (
                          <>
                            {renderComparisonCell(
                              "Supplier (GRN)",
                              comparisonDocs.grns[0].supplier,
                              grnSupplierStatus
                            )}

                            {renderComparisonCell(
                              "GRN IDs / Dates",
                              comparisonDocs.grns.map(g => `${g.grnNumber} (${formatStoredDateForDisplay(g.grnDate)})`).join(", "),
                              "agree"
                            )}

                            {renderComparisonCell(
                              "Item Description",
                              comparisonDocs.grns[0].itemDescription,
                              grnItemStatus
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              {renderComparisonCell(
                                "Total Qty Received",
                                totalRec,
                                grnQtyStatus
                              )}
                              {renderComparisonCell(
                                "Goods Condition",
                                comparisonDocs.grns.map(g => g.condition).join(", "),
                                grnConditionStatus
                              )}
                            </div>

                            {renderComparisonCell(
                              "Received By Personnel",
                              comparisonDocs.grns.map(g => g.receivedBy).filter(Boolean).join(", ") || "N/A",
                              "agree"
                            )}

                            <div className="text-[10px] text-gray-400 pt-3 border-t border-gray-100">
                              <div>Total Receipts Found: {comparisonDocs.grns.length}</div>
                              {comparisonDocs.grns.some(g => g.verifiedRecord) && (
                                <div className="text-indigo-600 font-semibold">✓ Verified AI Data</div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-10 px-4 bg-orange-50/20 border border-dashed border-orange-200 text-orange-700 font-semibold rounded-xl text-xs space-y-1">
                            <AlertOctagon className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                            <div>No Delivery Note Found (PO Ref {selectedLine.poNumber})</div>
                            <p className="text-[10px] font-normal text-orange-600/80">Goods received status cannot be verified.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Audit logs of previous human overrides */}
                {selectedLine.humanReview && (
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
                  <div className="border border-red-100 bg-red-50/20 p-4 rounded-xl text-xs space-y-1 mb-2">
                    <div className="font-bold text-red-900">Duplicate Resolution: {selectedLine.duplicateReviewDecision}</div>
                    <p className="text-red-800 italic">" {selectedLine.duplicateReviewNotes} "</p>
                    <div className="text-[10px] text-gray-500 pt-2 flex items-center justify-between">
                      <span>Verifier: {selectedLine.duplicateReviewerName}</span>
                      {selectedLine.duplicateIdentifiedOriginalId && <span>Original Record: {selectedLine.duplicateIdentifiedOriginalId}</span>}
                    </div>
                  </div>
                )}

                {/* Rematching & Audit Log History */}
                {selectedLine.auditLog && selectedLine.auditLog.length > 0 && (
                  <div className="border border-gray-200 bg-gray-50 p-4 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-gray-700 flex items-center space-x-1.5">
                      <ShieldCheck className="h-4 w-4 text-gray-500" />
                      <span>Ledger Match Change & Rematch Audit History ({selectedLine.auditLog.length})</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto pr-1 space-y-2">
                      {selectedLine.auditLog.map((log, idx) => (
                        <div key={idx} className="pt-2 text-[11px] text-gray-600 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400">
                            <span>{log.timestamp}</span>
                            <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider text-[8px]">
                              {log.triggerType}
                            </span>
                          </div>
                          <div>
                            Status changed: <span className="font-bold text-red-600">{log.previousStatus}</span> → <span className="font-bold text-green-600">{log.updatedStatus}</span>
                          </div>
                          {log.reason && (
                            <p className="text-gray-500 italic mt-0.5">Reason: "{log.reason}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exception Resolution / Audit Override Form */}
                <form onSubmit={handleSaveReview} className="border border-indigo-100 bg-indigo-50/10 p-5 rounded-2xl space-y-4">
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
                        onChange={(e) => setReviewerName(e.target.value)}
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
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Comparison Modal */}
      {showDuplicateCompareModal && selectedLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Duplicate Candidate Comparison</span>
              </h2>
              <button onClick={() => setShowDuplicateCompareModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Duplicate Check Context</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-xs text-gray-600 bg-red-50/50 p-4 rounded-xl border border-red-100">
                  <div>
                    <span className="block font-bold text-gray-900 mb-1">Check Source</span>
                    {selectedLine.duplicateCheckSource || "Unknown"}
                  </div>
                  <div>
                    <span className="block font-bold text-gray-900 mb-1">Group ID</span>
                    {selectedLine.duplicateGroupId || "N/A"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="block font-bold text-gray-900 mb-1">Reason</span>
                    {selectedLine.duplicateReason || "Flagged as duplicate."}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Current Record */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 border-b border-gray-200 p-3 text-center">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Current Record Under Review</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Record ID</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.recordId}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Supplier</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.supplierName}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Invoice Number</div>
                      <div className="col-span-2 font-bold text-indigo-600 text-right">{selectedLine.invoiceNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Source File</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right truncate" title={selectedLine.sourceFileName}>{selectedLine.sourceFileName}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">PO Number</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.poNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Invoice Date</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.invoiceDate}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Item</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right truncate" title={selectedLine.itemDescription}>{selectedLine.itemDescription}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs border-b border-gray-100 pb-2">
                      <div className="font-semibold text-gray-500">Qty x Price</div>
                      <div className="col-span-2 font-medium text-gray-900 text-right">{selectedLine.quantityInvoiced} x {selectedLine.currency} {selectedLine.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-3 text-xs pt-1">
                      <div className="font-bold text-gray-900">Invoice Total</div>
                      <div className="col-span-2 font-bold text-gray-900 text-right">{selectedLine.currency} {selectedLine.invoiceTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                
                {/* Candidate Record */}
                <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm bg-red-50/10">
                  <div className="bg-red-50 border-b border-red-200 p-3 text-center">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Candidate / Original Record</span>
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
                            <div className="col-span-2 text-right"><span className={`font-bold ${diffClass(selectedLine.invoiceNumber, candidate.invoiceNumber)}`}>{candidate.invoiceNumber || "N/A"}</span></div>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Side by Side Column Cell Renderer (Handles highlight logic)
// ----------------------------------------------------------------------
function renderComparisonCell(
  label: string, 
  value: any, 
  status: "agree" | "disagree" | "missing_doc", 
  extraInfo?: string
) {
  let bgClass = "";
  let textClass = "";
  let borderClass = "";

  if (status === "agree") {
    bgClass = "bg-teal-50/50";
    textClass = "text-teal-900";
    borderClass = "border-teal-100/50";
  } else if (status === "disagree") {
    bgClass = "bg-red-50";
    textClass = "text-red-900";
    borderClass = "border-red-200 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.1)]";
  } else {
    bgClass = "bg-orange-50/30";
    textClass = "text-orange-800/90";
    borderClass = "border-orange-200/40";
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-gray-400 font-semibold uppercase">{label}</div>
      <div
        className={`text-xs px-2.5 py-1.5 rounded font-medium border ${bgClass} ${textClass} ${borderClass}`}
      >
        {value === null || value === undefined ? "(missing / empty)" : String(value)}
      </div>
      {extraInfo && (
        <div className="text-[10px] text-red-600/95 font-bold mt-0.5 leading-tight">
          {extraInfo}
        </div>
      )}
    </div>
  );
}