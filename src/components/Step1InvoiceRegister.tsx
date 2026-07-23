/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, FileSpreadsheet, Check, AlertTriangle, RefreshCw, 
  HelpCircle, Download, Trash2, Plus, ArrowRight, Sparkles, X,
  Edit2, History, AlertCircle, Save, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InvoiceLine, ColumnMapping, DateStandardisationRecord, POLine, GRNLine } from "../types";
import { parseExcelFile, formatDate, formatCurrencyValue, formatStoredDateForDisplay } from "../lib/excelParser";
import { downloadSampleInvoiceRegister } from "../lib/sampleGenerator";
import { standardiseAllCollections } from "../lib/dateStandardiser";

interface Props {
  historicalInvoices: InvoiceLine[];
  setHistoricalInvoices: (lines: InvoiceLine[]) => void;
  onInvoicesLoaded: (lines: InvoiceLine[], fileName: string) => void;
  existingInvoices: InvoiceLine[];
  onUpdateInvoices: (updated: InvoiceLine[]) => void;

  // App 1 state preservation from App.tsx
  sheetsData: any;
  setSheetsData: (data: any) => void;
  summaryMappings: ColumnMapping[];
  setSummaryMappings: (mappings: ColumnMapping[]) => void;
  granularMappings: ColumnMapping[];
  setGranularMappings: (mappings: ColumnMapping[]) => void;
  isApp1Format: boolean;
  setIsApp1Format: (val: boolean) => void;
  mappingChangeHistory: any[];
  setMappingChangeHistory: (log: any[]) => void;
  isRematchRequired: boolean;
  setIsRematchRequired: (val: boolean) => void;

  dateStandardisations: DateStandardisationRecord[];
  setDateStandardisations: (stds: DateStandardisationRecord[]) => void;
  excelDate1904: boolean;
  setExcelDate1904: (val: boolean) => void;
  poLines: POLine[];
  grnLines: GRNLine[];
  setPoLines: (lines: POLine[]) => void;
  setGrnLines: (lines: GRNLine[]) => void;
}

const TARGET_INVOICE_FIELDS = [
  { key: "recordId", label: "Record ID", required: true },
  { key: "sourceFileName", label: "Source File", required: true },
  { key: "supplierName", label: "Supplier Name", required: true },
  { key: "invoiceNumber", label: "Invoice Number", required: true },
  { key: "invoiceDate", label: "Invoice Date", required: true },
  { key: "invoiceDueDate", label: "Invoice Due Date", required: false },
  { key: "billTo", label: "Bill-to Information", required: false },
  { key: "poNumber", label: "PO Number", required: true },
  { key: "lineNumber", label: "Line Number", required: false },
  { key: "itemDescription", label: "Item Description", required: true },
  { key: "quantityInvoiced", label: "Quantity Invoiced", required: true },
  { key: "unitPrice", label: "Unit Price", required: true },
  { key: "lineAmount", label: "Line Amount", required: false },
  { key: "subtotal", label: "Subtotal", required: false },
  { key: "gst", label: "GST (Tax)", required: false },
  { key: "invoiceTotal", label: "Invoice Total", required: true },
  { key: "currency", label: "Currency", required: false },
  { key: "duplicateStatus", label: "Duplicate Status", required: false },
  { key: "duplicateOf", label: "Duplicate Of", required: false },
  { key: "extractionStatus", label: "Extraction Status", required: false },
  { key: "fieldsRequiringReview", label: "Fields Requiring Review", required: false },
  { key: "extractionNotes", label: "Extraction Notes", required: false },
  { key: "supplierAddress", label: "Supplier Address (Preserved)", required: false },
  { key: "bankDetails", label: "Bank Details (Preserved)", required: false },
  { key: "paymentReference", label: "Payment Reference (Preserved)", required: false },
  { key: "paymentTerms", label: "Payment Terms (Preserved)", required: false },
  { key: "supplierContactDetails", label: "Supplier Contact Details", required: false },
  { key: "businessRegTaxId", label: "Business Reg / Tax ID", required: false },
  { key: "acceptedPaymentMethod", label: "Accepted Payment Method", required: false },
  { key: "latePaymentTerms", label: "Late Payment Terms", required: false },
];

export function isMissingValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return s === "" || s === "n/a" || s === "not available" || s === "not provided" || s === "blank" || s === "not_provided" || s === "notprovided" || s === "notavailable" || s === "none";
}

export function getCompatibleCompareTargets(
  suggestedField: string | null,
  poLines: POLine[] = [],
  grnLines: GRNLine[] = []
): Array<{ value: string; label: string }> {
  if (!suggestedField) return [];
  
  if (suggestedField === "supplierName") {
    return [
      { value: "po.supplier", label: "PO Supplier Name" },
      { value: "grn.supplier", label: "GRN Supplier Name" }
    ];
  }
  
  if (suggestedField === "businessRegTaxId") {
    const poHasTax = poLines.some(p => p.businessRegTaxId && !isMissingValue(p.businessRegTaxId));
    const grnHasTax = grnLines.some(g => g.businessRegTaxId && !isMissingValue(g.businessRegTaxId));
    
    const targets = [];
    if (poHasTax) {
      targets.push({ value: "po.businessRegTaxId", label: "PO Business Reg / Tax ID" });
    }
    if (grnHasTax) {
      targets.push({ value: "grn.businessRegTaxId", label: "GRN Business Reg / Tax ID" });
    }
    return targets;
  }
  
  if (suggestedField === "supplierContactDetails") {
    const poHasContact = poLines.some(p => p.supplierContactDetails && !isMissingValue(p.supplierContactDetails));
    const grnHasContact = grnLines.some(g => g.supplierContactDetails && !isMissingValue(g.supplierContactDetails));
    
    const targets = [];
    if (poHasContact) {
      targets.push({ value: "po.supplierContactDetails", label: "PO Supplier Contact Details" });
    }
    if (grnHasContact) {
      targets.push({ value: "grn.supplierContactDetails", label: "GRN Supplier Contact Details" });
    }
    return targets;
  }
  
  return []; // Core fields map automatically; other optional fields have no compatible target
}

export default function Step1InvoiceRegister({ 
  onInvoicesLoaded, 
  existingInvoices, 
  onUpdateInvoices,
  sheetsData,
  setSheetsData,
  summaryMappings,
  setSummaryMappings,
  granularMappings,
  setGranularMappings,
  isApp1Format,
  setIsApp1Format,
  mappingChangeHistory,
  setMappingChangeHistory,
  isRematchRequired,
  setIsRematchRequired,
  dateStandardisations,
  setDateStandardisations,
  excelDate1904,
  setExcelDate1904,
  poLines,
  grnLines,
  setPoLines,
  setGrnLines
}: Props) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showReplaceUpload, setShowReplaceUpload] = useState(existingInvoices.length === 0);
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [activeMappingTab, setActiveMappingTab] = useState<"summary" | "granular">("summary");
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [duplicateUploadFile, setDuplicateUploadFile] = useState<{file: File, isApp1: boolean, parsed: any} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historicalFileInputRef = useRef<HTMLInputElement>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);

  // States for Date Standardisation corrections
  const [editingDateRecordId, setEditingDateRecordId] = useState<string | null>(null);
  const [dateCorrectionValue, setDateCorrectionValue] = useState<string>("");
  const [bulkConfirmWorksheet, setBulkConfirmWorksheet] = useState<string>("");
  const [bulkConfirmColumn, setBulkConfirmColumn] = useState<string>("");
  const [bulkConfirmScheme, setBulkConfirmScheme] = useState<"day-first" | "month-first">("day-first");
  const [dateFilterTab, setDateFilterTab] = useState<string>("All");

  const runDateStandardisationAndUpdate = (
    invs: InvoiceLine[],
    pos: POLine[] = poLines,
    grns: GRNLine[] = grnLines,
    sMappings: ColumnMapping[] = summaryMappings,
    is1904: boolean = excelDate1904
  ) => {
    const sMap = isApp1Format ? sMappings : mappings;
    const res = standardiseAllCollections(invs, pos, grns, dateStandardisations, sMap, is1904);
    
    onUpdateInvoices(res.invoices);
    setPoLines(res.poLines);
    setGrnLines(res.grnLines);
    setDateStandardisations(res.dateStandardisations);
  };

  const formatDisplayDate = (d: string) => {
    if (!d || d === "INVALID" || d === "") return d;
    // Assume YYYY-MM-DD internally
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    }
    return d; // Fallback
  };

  const handleConfirmDateRecord = (id: string) => {
    const updated = dateStandardisations.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          reviewStatus: "Automatically Standardised" as const,
          confirmedBy: "Lead AP Auditor",
          confirmedAt: new Date().toISOString()
        };
      }
      return rec;
    });
    applyUpdatedDateStandardisations(updated);
  };

  const handleSwapDateInterpretation = (id: string) => {
    const updated = dateStandardisations.map(rec => {
      if (rec.id === id && rec.alternativeInterpretation) {
        const prevStd = rec.standardisedDate;
        const prevAlt = rec.alternativeInterpretation;
        return {
          ...rec,
          standardisedDate: prevAlt,
          alternativeInterpretation: prevStd,
          reviewStatus: "Human Corrected" as const,
          confirmedBy: "Lead AP Auditor",
          confirmedAt: new Date().toISOString(),
          userCorrection: prevAlt
        };
      }
      return rec;
    });
    applyUpdatedDateStandardisations(updated);
  };

  const handleCorrectDateRecord = (id: string, textValue: string) => {
    const match = textValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
      alert("Please enter a valid date in DD/MM/YYYY format.");
      return;
    }
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);

    const { isValidCalendarDate } = require("../lib/dateStandardiser");
    if (!isValidCalendarDate(y, m, d)) {
      alert("This is not a valid calendar date.");
      return;
    }

    const updated = dateStandardisations.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          standardisedDate: textValue,
          reviewStatus: "Human Corrected" as const,
          confirmedBy: "Lead AP Auditor",
          confirmedAt: new Date().toISOString(),
          userCorrection: textValue
        };
      }
      return rec;
    });
    applyUpdatedDateStandardisations(updated);
    setEditingDateRecordId(null);
  };

  const handleBulkConfirmColumnFormat = (worksheet: string, column: string, scheme: "day-first" | "month-first") => {
    const { standardiseSingleValue } = require("../lib/dateStandardiser");

    const updated = dateStandardisations.map(rec => {
      if (rec.worksheet === worksheet && rec.originalColumn === column) {
        const result = standardiseSingleValue(rec.originalValue, scheme, excelDate1904);
        return {
          ...rec,
          standardisedDate: result.standardised,
          alternativeInterpretation: result.alternative,
          reviewStatus: "Automatically Standardised" as const,
          confirmedBy: "Lead AP Auditor",
          confirmedAt: new Date().toISOString(),
          detectionMethod: `Bulk Confirmed Column Format (${scheme === "day-first" ? "Day-First" : "Month-First"})`
        };
      }
      return rec;
    });
    applyUpdatedDateStandardisations(updated);
  };

  const applyUpdatedDateStandardisations = (newStds: DateStandardisationRecord[]) => {
    setDateStandardisations(newStds);

    const updatedInvoices = existingInvoices.map(inv => {
      const stdDate = newStds.find(s => s.worksheet === "Invoices Summary" && s.recordId === inv.recordId && s.fieldKey === "invoiceDate");
      const stdDueDate = newStds.find(s => s.worksheet === "Invoices Summary" && s.recordId === inv.recordId && s.fieldKey === "invoiceDueDate");

      const nextInv = { ...inv };
      if (stdDate && stdDate.standardisedDate && stdDate.standardisedDate !== "INVALID") {
        nextInv.invoiceDate = stdDate.standardisedDate;
      }
      if (stdDueDate && stdDueDate.standardisedDate && stdDueDate.standardisedDate !== "INVALID") {
        nextInv.invoiceDueDate = stdDueDate.standardisedDate;
      }
      return nextInv;
    });

    const updatedPOs = poLines.map(po => {
      const stdDate = newStds.find(s => s.worksheet === "PO Lines" && s.recordId === po.id && s.fieldKey === "poDate");
      const stdDeliv = newStds.find(s => s.worksheet === "PO Lines" && s.recordId === po.id && s.fieldKey === "expectedDelivery");

      const nextPo = { ...po };
      if (stdDate && stdDate.standardisedDate && stdDate.standardisedDate !== "INVALID") {
        nextPo.poDate = stdDate.standardisedDate;
      }
      if (stdDeliv && stdDeliv.standardisedDate && stdDeliv.standardisedDate !== "INVALID") {
        nextPo.expectedDelivery = stdDeliv.standardisedDate;
      }
      return nextPo;
    });

    const updatedGRNs = grnLines.map(grn => {
      const stdDate = newStds.find(s => s.worksheet === "GRN Lines" && s.recordId === grn.id && s.fieldKey === "grnDate");

      const nextGrn = { ...grn };
      if (stdDate && stdDate.standardisedDate && stdDate.standardisedDate !== "INVALID") {
        nextGrn.grnDate = stdDate.standardisedDate;
      }
      return nextGrn;
    });

    onUpdateInvoices(updatedInvoices);
    setPoLines(updatedPOs);
    setGrnLines(updatedGRNs);
    setIsRematchRequired(true);
  };

  // States for general non-App1 single-sheet fallback
  const [headers, setHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  // States for Inline Field Editing
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<any>(null);

  // Manual Row Addition states
  const [showManualForm, setShowManualForm] = useState(false);
  const [mSupplierName, setMSupplierName] = useState("");
  const [mInvoiceNumber, setMInvoiceNumber] = useState("");
  const [mInvoiceDate, setMInvoiceDate] = useState("");
  const [mInvoiceDueDate, setMInvoiceDueDate] = useState("");
  const [mPoNumber, setMPoNumber] = useState("");
  const [mLineNumber, setMLineNumber] = useState("1");
  const [mItemDesc, setMItemDesc] = useState("");
  const [mQty, setMQty] = useState<number | "">("");
  const [mPrice, setMPrice] = useState<number | "">("");
  const [mTotal, setMTotal] = useState<number | "">("");

  // Helper: Format Money Display
  const formatMoney = (val: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  // Helper: Fuzzy matching suggestions for standard single sheets
  const performLocalFuzzyMatch = (cols: Array<{ header: string; sampleValues: string[] }>): ColumnMapping[] => {
    return cols.map((col) => {
      const headerLower = col.header.toLowerCase().replace(/[^a-z0-9]/g, "");
      let suggestedField: string | null = null;
      let status: ColumnMapping["status"] = "unmapped";

      if (headerLower.includes("recordid") || headerLower === "id" || headerLower === "recid") {
        suggestedField = "recordId";
        status = "automatically mapped";
      } else if (
        headerLower === "sourcefile" ||
        headerLower === "sourcedocumentname" ||
        headerLower === "invoicefile" ||
        headerLower === "filename" ||
        headerLower.includes("sourcefile") ||
        headerLower.includes("filename")
      ) {
        suggestedField = "sourceFileName";
        status = "automatically mapped";
      } else if (headerLower.includes("supplier") || headerLower.includes("vendor") || headerLower === "name") {
        suggestedField = "supplierName";
        status = "automatically mapped";
      } else if (headerLower.includes("invoicenumber") || headerLower.includes("invnum") || headerLower === "invno" || headerLower === "invoiceno") {
        suggestedField = "invoiceNumber";
        status = "automatically mapped";
      } else if (headerLower === "invoicedate" || headerLower === "invdate" || headerLower === "date") {
        suggestedField = "invoiceDate";
        status = "automatically mapped";
      } else if (headerLower.includes("duedate") || headerLower.includes("due")) {
        suggestedField = "invoiceDueDate";
        status = "automatically mapped";
      } else if (headerLower.includes("billto") || headerLower.includes("customer")) {
        suggestedField = "billTo";
        status = "automatically mapped";
      } else if (headerLower.includes("ponumber") || headerLower.includes("po") || headerLower === "po_number" || headerLower === "orderno") {
        suggestedField = "poNumber";
        status = "automatically mapped";
      } else if (headerLower.includes("linenumber") || headerLower.includes("lineno") || headerLower === "line") {
        suggestedField = "lineNumber";
        status = "automatically mapped";
      } else if (headerLower.includes("description") || headerLower.includes("item") || headerLower.includes("particulars")) {
        suggestedField = "itemDescription";
        status = "automatically mapped";
      } else if (headerLower.includes("qty") || headerLower.includes("quantity") || headerLower.includes("quantityinvoiced")) {
        suggestedField = "quantityInvoiced";
        status = "automatically mapped";
      } else if (headerLower.includes("unitprice") || headerLower.includes("price") || headerLower.includes("rate")) {
        suggestedField = "unitPrice";
        status = "automatically mapped";
      } else if (headerLower.includes("lineamount") || headerLower.includes("linetotal") || headerLower === "amount") {
        suggestedField = "lineAmount";
        status = "automatically mapped";
      } else if (headerLower.includes("subtotal") || headerLower.includes("netamount")) {
        suggestedField = "subtotal";
        status = "automatically mapped";
      } else if (headerLower.includes("gst") || headerLower.includes("tax") || headerLower.includes("vat")) {
        suggestedField = "gst";
        status = "automatically mapped";
      } else if (headerLower.includes("total") || headerLower.includes("grandtotal") || headerLower.includes("invoiceval")) {
        suggestedField = "invoiceTotal";
        status = "automatically mapped";
      } else if (headerLower.includes("currency") || headerLower.includes("curr")) {
        suggestedField = "currency";
        status = "automatically mapped";
      } else if (headerLower.includes("duplicate")) {
        suggestedField = "duplicateStatus";
        status = "automatically mapped";
      } else if (headerLower.includes("extraction") || headerLower.includes("ocr")) {
        suggestedField = "extractionStatus";
        status = "confirmation required";
      } else if (headerLower.includes("notes") || headerLower.includes("comment")) {
        suggestedField = "extractionNotes";
        status = "confirmation required";
      } else if (headerLower.includes("address")) {
        suggestedField = "supplierAddress";
        status = "confirmation required";
      } else if (headerLower.includes("bank") || headerLower.includes("iban") || headerLower.includes("acct")) {
        suggestedField = "bankDetails";
        status = "confirmation required";
      } else if (headerLower.includes("reference") || headerLower.includes("paymentref")) {
        suggestedField = "paymentReference";
        status = "confirmation required";
      } else if (headerLower.includes("terms") || headerLower.includes("days")) {
        suggestedField = "paymentTerms";
        status = "confirmation required";
      }

      return {
        originalColumn: col.header,
        suggestedField,
        status,
        sampleValue: col.sampleValues[0] || "N/A"
      };
    });
  };

  // Automated mapping dictionary generation for App 1 worksheets
  const generateApp1DefaultMappings = (sheets: any) => {
    const sumCols = sheets["Invoices Summary"]?.headers || [];
    const granCols = sheets["Granular Line Items"]?.headers || [];

    const summaryMap: ColumnMapping[] = sumCols.map((col: string) => {
      const headerLower = col.toLowerCase().trim();
      let suggestedField: string | null = null;
      if (headerLower === "invoice number" || headerLower === "invoice_number" || headerLower === "inv number") {
        suggestedField = "invoiceNumber";
      } else if (headerLower === "invoice date" || headerLower === "date") {
        suggestedField = "invoiceDate";
      } else if (headerLower === "payment due date" || headerLower === "due date") {
        suggestedField = "invoiceDueDate";
      } else if (headerLower === "purchase order (po)" || headerLower === "po" || headerLower === "purchase order") {
        suggestedField = "poNumber";
      } else if (headerLower === "final amount payable" || headerLower === "invoice total") {
        suggestedField = "invoiceTotal";
      } else if (headerLower === "invoice subtotal" || headerLower === "subtotal") {
        suggestedField = "subtotal";
      } else if (headerLower === "total discount" || headerLower === "discount") {
        suggestedField = "invoiceLevelDiscount";
      } else if (headerLower === "total tax" || headerLower === "tax" || headerLower === "gst") {
        suggestedField = "invoiceTax";
      } else if (headerLower === "delivery/additional charges" || headerLower === "delivery charges" || headerLower === "additional charges") {
        suggestedField = "additionalCharges";
      } else if (headerLower === "source file name" || headerLower === "source file") {
        suggestedField = "sourceFileName";
      } else if (headerLower === "currency") {
        suggestedField = "currency";
      } else if (headerLower === "supplier name" || headerLower === "supplier") {
        suggestedField = "supplierName";
      } else if (headerLower === "supplier address") {
        suggestedField = "supplierAddress";
      } else if (headerLower === "payment terms") {
        suggestedField = "paymentTerms";
      } else if (headerLower === "bank details") {
        suggestedField = "bankDetails";
      } else if (headerLower === "bank account / iban" || headerLower === "bank account" || headerLower === "iban") {
        suggestedField = "bankAccountIban";
      } else if (headerLower === "amount already paid") {
        suggestedField = "amountAlreadyPaid";
      } else if (headerLower === "outstanding balance") {
        suggestedField = "outstandingBalance";
      } else if (headerLower === "supplier contact details" || headerLower === "supplier contact" || headerLower === "contact details" || headerLower === "supplier contact details") {
        suggestedField = "supplierContactDetails";
      } else if (headerLower === "business reg / tax id" || headerLower === "business reg" || headerLower === "tax id" || headerLower === "tax_id" || headerLower === "business registration") {
        suggestedField = "businessRegTaxId";
      } else if (headerLower === "accepted payment method" || headerLower === "payment method") {
        suggestedField = "acceptedPaymentMethod";
      } else if (headerLower === "late payment terms" || headerLower === "late terms") {
        suggestedField = "latePaymentTerms";
      }

      let useInMatching: "Required Match" | "Optional Check" | "Reference Only" = "Reference Only";
      let compareAgainst: string | null = null;

      if (suggestedField) {
        if (["invoiceNumber", "poNumber", "supplierName"].includes(suggestedField)) {
          useInMatching = "Required Match";
          if (suggestedField === "supplierName") compareAgainst = "po.supplier";
          else if (suggestedField === "poNumber") compareAgainst = "po.poNumber";
        } else {
          const compatTargets = getCompatibleCompareTargets(suggestedField, poLines, grnLines);
          if (compatTargets.length > 0) {
            useInMatching = "Optional Check";
            compareAgainst = compatTargets[0].value;
          } else {
            useInMatching = "Reference Only";
            compareAgainst = null;
          }
        }
      }

      return {
        originalColumn: col,
        suggestedField,
        status: suggestedField ? "automatically mapped" : "unmapped",
        sampleValue: String(sheets["Invoices Summary"]?.rows?.[0]?.[col] || "N/A"),
        useInMatching,
        compareAgainst
      };
    });

    const granularMap: ColumnMapping[] = granCols.map((col: string) => {
      const headerLower = col.toLowerCase().trim();
      let suggestedField: string | null = null;
      if (headerLower === "invoice number" || headerLower === "invoice_number") {
        suggestedField = "granularInvoiceNumber";
      } else if (headerLower === "product / service description" || headerLower === "item description" || headerLower === "description") {
        suggestedField = "itemDescription";
      } else if (headerLower === "quantity" || headerLower === "qty") {
        suggestedField = "quantityInvoiced";
      } else if (headerLower === "unit price" || headerLower === "price") {
        suggestedField = "unitPrice";
      } else if (headerLower === "discount (item)" || headerLower === "line discount") {
        suggestedField = "lineDiscount";
      } else if (headerLower === "tax rate (%)" || headerLower === "tax rate") {
        suggestedField = "lineTaxRate";
      } else if (headerLower === "tax amount (item)" || headerLower === "line tax") {
        suggestedField = "lineTax";
      } else if (headerLower === "total amount" || headerLower === "line total") {
        suggestedField = "netLineTotal";
      } else if (headerLower === "supplier name" || headerLower === "supplier") {
        suggestedField = "supplierName";
      } else if (headerLower === "currency") {
        suggestedField = "currency";
      }

      let useInMatching: "Required Match" | "Optional Check" | "Reference Only" = "Reference Only";
      let compareAgainst: string | null = null;

      if (suggestedField) {
        if (["itemDescription", "quantityInvoiced", "unitPrice"].includes(suggestedField)) {
          useInMatching = "Required Match";
          if (suggestedField === "itemDescription") compareAgainst = "po.itemDescription";
          else if (suggestedField === "quantityInvoiced") compareAgainst = "po.quantityOrdered";
          else if (suggestedField === "unitPrice") compareAgainst = "po.unitPrice";
        }
      }

      return {
        originalColumn: col,
        suggestedField,
        status: suggestedField ? "automatically mapped" : "unmapped",
        sampleValue: String(sheets["Granular Line Items"]?.rows?.[0]?.[col] || "N/A"),
        useInMatching,
        compareAgainst
      };
    });

    return { summaryMap, granularMap };
  };

  const processValidatedFile = async (file: File, parsed: any, isApp1: boolean, replaceExisting: boolean) => {
    let baseInvoices = replaceExisting ? existingInvoices.filter(inv => inv.sourceFileName !== file.name) : existingInvoices;
    
    if (isApp1) {
      setSheetsData(parsed.sheets);
      setIsApp1Format(true);

      const { summaryMap, granularMap } = generateApp1DefaultMappings(parsed.sheets);
      setSummaryMappings(summaryMap);
      setGranularMappings(granularMap);

      const joinedLines = buildAndValidateApp1Invoices(parsed.sheets, summaryMap, granularMap, file.name, !!parsed.date1904, file.size);
      runDateStandardisationAndUpdate([...baseInvoices, ...joinedLines], poLines, grnLines, summaryMap, !!parsed.date1904);
      setShowReplaceUpload(false);
      setLoading(false);
    } else {
      setIsApp1Format(false);
      setHeaders(parsed.headers);
      setExcelRows(parsed.rows);

      const columnsPayload = parsed.headers.map((header) => {
        const samples = parsed.rows.slice(0, 3).map((r) => String(r[header] || ""));
        return { header, sampleValues: samples.filter(Boolean) };
      });

      const localMappings = performLocalFuzzyMatch(columnsPayload);
      setMappings(localMappings);
      setLoading(false);
    }
  };

  // Core Processing for Excel Workbook File
  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please select a valid Excel workbook file (.xlsx or .xls)");
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);
    setFileSize(file.size);

    try {
      const parsed = await parseExcelFile(file);
      setExcelDate1904(!!parsed.date1904);

      // Check if this workbook matches the App 1 structure
      const isApp1 = !!(parsed.sheets && parsed.sheets["Invoices Summary"] && parsed.sheets["Granular Line Items"]);
      
      const isDuplicate = existingInvoices.some(inv => inv.sourceFileName === file.name && inv.sourceFileSize === file.size);
      if (isDuplicate) {
        setDuplicateUploadFile({ file, parsed, isApp1 });
        setLoading(false);
        return;
      }

      await processValidatedFile(file, parsed, isApp1, false);
    } catch (err: any) {
      setError(err.message || "Failed to process the Excel file.");
      setLoading(false);
    }
  };

  // Re-run Joined Validation and Assembly (App 1)
  const rebuildAndValidate = (sMappings: ColumnMapping[], gMappings: ColumnMapping[]) => {
    if (!sheetsData) return;
    const rebuiltLines = buildAndValidateApp1Invoices(sheetsData, sMappings, gMappings, fileName || "Excel Upload", excelDate1904, fileSize);
    runDateStandardisationAndUpdate(rebuiltLines, poLines, grnLines, sMappings, excelDate1904);
  };

  // Manual Input Drop Event Handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = () => {
    setIsDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // 1-Sheet Mapping Updates
  const updateSingleSheetMapping = (colName: string, fieldKey: string | null) => {
    setMappings(prev => prev.map(m => {
      if (m.originalColumn === colName) {
        return {
          ...m,
          suggestedField: fieldKey || null,
          status: fieldKey ? "automatically mapped" : "unmapped"
        };
      }
      return m;
    }));
  };

  // 1-Sheet Mapping Confirmation
  const handleConfirmSingleSheetMappings = () => {
    const mappedFields = mappings
      .filter((m) => m.suggestedField !== null)
      .map((m) => m.suggestedField);

    let missingRequired = TARGET_INVOICE_FIELDS
      .filter((f) => f.required)
      .filter((f) => !mappedFields.includes(f.key));

    const duplicateStatusCol = mappings.find(m => m.suggestedField === "duplicateStatus")?.originalColumn;
    const hasDuplicateWarning = duplicateStatusCol && excelRows.some(row => {
      const val = String(row[duplicateStatusCol] || "").trim();
      return val === "Possible Duplicate" || val === "Exact Duplicate";
    });

    if (hasDuplicateWarning && !mappedFields.includes("duplicateOf")) {
       missingRequired.push({ key: "duplicateOf", label: "Duplicate Of", required: true });
    }

    if (missingRequired.length > 0) {
      setError(`Cannot proceed. Please map the mandatory target fields: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    const finalInvoices: InvoiceLine[] = excelRows.map((row, index) => {
      const line: Partial<InvoiceLine> = {
        recordId: `INV-REC-${existingInvoices.length + index + 1}`,
        lineNumber: "1",
        sourceFileName: fileName || "Excel Upload",
        sourceFileSize: fileSize,
        sourceWorkbookName: fileName || "Excel Upload",
        duplicateStatus: "Clear",
        extractionStatus: "clear",
        dateParserVersion: "v2-date-only",
        worksheetOrigin: "Single Worksheet Fallback",
        importValidationStatus: "Ready for Match"
      };

      mappings.forEach((mapping) => {
        if (!mapping.suggestedField) return;
        const rawVal = row[mapping.originalColumn];

        if (mapping.suggestedField === "recordId") {
          line.recordId = rawVal ? String(rawVal) : line.recordId;
        } else if (mapping.suggestedField === "sourceFileName") {
          line.sourceFileName = rawVal ? String(rawVal) : "N/A";
          line.sourceWorkbookName = fileName || "Excel Upload";
        } else if (mapping.suggestedField === "supplierName") {
          line.supplierName = String(rawVal || "");
        } else if (mapping.suggestedField === "invoiceNumber") {
          line.invoiceNumber = String(rawVal || "");
        } else if (mapping.suggestedField === "invoiceDate") {
          line.invoiceDate = formatDate(rawVal, excelDate1904);
        } else if (mapping.suggestedField === "invoiceDueDate") {
          line.invoiceDueDate = formatDate(rawVal, excelDate1904);
        } else if (mapping.suggestedField === "billTo") {
          line.billTo = String(rawVal || "");
        } else if (mapping.suggestedField === "poNumber") {
          line.poNumber = String(rawVal || "");
        } else if (mapping.suggestedField === "lineNumber") {
          line.lineNumber = String(rawVal || "");
        } else if (mapping.suggestedField === "itemDescription") {
          line.itemDescription = String(rawVal || "");
        } else if (mapping.suggestedField === "quantityInvoiced") {
          line.quantityInvoiced = Number(rawVal) || 0;
        } else if (mapping.suggestedField === "unitPrice") {
          line.unitPrice = formatCurrencyValue(rawVal);
        } else if (mapping.suggestedField === "lineAmount") {
          line.lineAmount = formatCurrencyValue(rawVal);
        } else if (mapping.suggestedField === "subtotal") {
          line.subtotal = formatCurrencyValue(rawVal);
        } else if (mapping.suggestedField === "gst") {
          line.gst = formatCurrencyValue(rawVal);
        } else if (mapping.suggestedField === "invoiceTotal") {
          line.invoiceTotal = formatCurrencyValue(rawVal);
        } else if (mapping.suggestedField === "currency") {
          line.currency = String(rawVal || "USD");
        } else if (mapping.suggestedField === "duplicateStatus") {
          line.duplicateStatus = String(rawVal || "Clear") as any;
        } else if (mapping.suggestedField === "duplicateOf") {
          line.duplicateOf = String(rawVal || "");
        } else if (mapping.suggestedField === "extractionStatus") {
          line.extractionStatus = String(rawVal || "clear");
        } else if (mapping.suggestedField === "fieldsRequiringReview") {
          line.fieldsRequiringReview = String(rawVal || "");
        } else if (mapping.suggestedField === "extractionNotes") {
          line.extractionNotes = String(rawVal || "");
        } else if (mapping.suggestedField === "supplierContactDetails") {
          line.supplierContactDetails = String(rawVal || "");
        } else if (mapping.suggestedField === "businessRegTaxId") {
          line.businessRegTaxId = String(rawVal || "");
        } else if (mapping.suggestedField === "acceptedPaymentMethod") {
          line.acceptedPaymentMethod = String(rawVal || "");
        } else if (mapping.suggestedField === "latePaymentTerms") {
          line.latePaymentTerms = String(rawVal || "");
        }
      });

      line.originalData = row;
      return line as InvoiceLine;
    });

    onInvoicesLoaded([...existingInvoices, ...finalInvoices], fileName || "Excel Upload");
    setHeaders([]);
    setExcelRows([]);
    setMappings([]);
    setShowReplaceUpload(false);
  };

  // App 1 Mapping Updates with Audit History Preservation
  const updateApp1Mapping = (sheetType: "summary" | "granular", originalCol: string, targetKey: string | null) => {
    const list = sheetType === "summary" ? summaryMappings : granularMappings;
    const oldMapping = list.find(m => m.originalColumn === originalCol);
    const prevField = oldMapping ? oldMapping.suggestedField : null;

    if (prevField === targetKey) return; // No change

    // Show change confirmation dialog
    setConfirmModalData({
      type: "mapping",
      sheetType,
      originalColumn: originalCol,
      previousMappedField: prevField,
      newMappedField: targetKey,
      message: `Change mapping for column "${originalCol}" in '${sheetType === "summary" ? "Invoices Summary" : "Granular Line Items"}' sheet from "${prevField || "Unmapped"}" to "${targetKey || "Unmapped"}"?`
    });
    setShowConfirmModal(true);
  };

  const applyMappingChange = () => {
    if (!confirmModalData) return;
    const { sheetType, originalColumn, previousMappedField, newMappedField } = confirmModalData;

    const logEntry = {
      originalColumn,
      previousMappedField,
      newMappedField,
      changedBy: "Lead AP Auditor",
      timestamp: new Date().toLocaleString()
    };

    setMappingChangeHistory([...mappingChangeHistory, logEntry]);
    setIsRematchRequired(true);

    if (sheetType === "summary") {
      const updated: ColumnMapping[] = summaryMappings.map(m => {
        if (m.originalColumn === originalColumn) {
          return {
            ...m,
            suggestedField: newMappedField,
            status: (newMappedField ? "automatically mapped" : "unmapped") as ColumnMapping["status"]
          };
        }
        return m;
      });
      setSummaryMappings(updated);
      rebuildAndValidate(updated, granularMappings);
    } else {
      const updated: ColumnMapping[] = granularMappings.map(m => {
        if (m.originalColumn === originalColumn) {
          return {
            ...m,
            suggestedField: newMappedField,
            status: (newMappedField ? "automatically mapped" : "unmapped") as ColumnMapping["status"]
          };
        }
        return m;
      });
      setGranularMappings(updated);
      rebuildAndValidate(summaryMappings, updated);
    }

    setShowConfirmModal(false);
    setConfirmModalData(null);
  };

  const handleUpdateMappingControl = (
    sheetType: "summary" | "granular",
    originalCol: string,
    field: "useInMatching" | "compareAgainst" | "suggestedField",
    value: any
  ) => {
    const listSetter = sheetType === "summary" ? setSummaryMappings : setGranularMappings;
    const list = sheetType === "summary" ? summaryMappings : granularMappings;
    const oldMapping = list.find(m => m.originalColumn === originalCol);
    const prevValue = oldMapping ? oldMapping[field] : null;

    if (prevValue === value) return;

    const timestamp = new Date().toLocaleString();
    const changedBy = "Lead AP Auditor";
    
    // Log choice change
    setMappingChangeHistory([
      ...mappingChangeHistory,
      {
        originalColumn: originalCol,
        previousMappedField: prevValue ? String(prevValue) : "None",
        newMappedField: value ? String(value) : "None",
        changedBy,
        timestamp,
        type: field
      }
    ]);

    const nextList = list.map(m => {
      if (m.originalColumn === originalCol) {
        const updated = {
          ...m,
          [field]: value
        };
        
        if (field === "suggestedField") {
          updated.suggestedField = value;
          if (["invoiceNumber", "poNumber", "supplierName", "itemDescription", "quantityInvoiced", "unitPrice"].includes(value || "")) {
            updated.useInMatching = "Required Match";
            if (value === "supplierName") updated.compareAgainst = "po.supplier";
            else if (value === "poNumber") updated.compareAgainst = "po.poNumber";
            else if (value === "itemDescription") updated.compareAgainst = "po.itemDescription";
            else if (value === "quantityInvoiced") updated.compareAgainst = "po.quantityOrdered";
            else if (value === "unitPrice") updated.compareAgainst = "po.unitPrice";
          } else {
            const targets = getCompatibleCompareTargets(value, poLines, grnLines);
            if (targets.length > 0) {
              updated.useInMatching = "Optional Check";
              updated.compareAgainst = targets[0].value;
            } else {
              updated.useInMatching = "Reference Only";
              updated.compareAgainst = null;
            }
          }
        } else if (field === "useInMatching") {
          updated.useInMatching = value;
          if (value === "Reference Only") {
            updated.compareAgainst = null;
          } else {
            const targets = getCompatibleCompareTargets(m.suggestedField, poLines, grnLines);
            if (targets.length > 0) {
              if (!targets.some(t => t.value === updated.compareAgainst)) {
                updated.compareAgainst = targets[0].value;
              }
            } else {
              updated.useInMatching = "Reference Only";
              updated.compareAgainst = null;
            }
          }
        }
        return updated;
      }
      return m;
    });

    listSetter(nextList);

    // Recalculate joined invoices instantly
    if (sheetType === "summary") {
      rebuildAndValidate(nextList, granularMappings);
    } else {
      rebuildAndValidate(summaryMappings, nextList);
    }

    setIsRematchRequired(true);
  };

  // Inline Value Correction Handlers
  const startEditing = (line: InvoiceLine) => {
    setEditingRecordId(line.recordId);
    setEditValues({
      supplierName: line.supplierName,
      poNumber: line.poNumber,
      quantityInvoiced: line.quantityInvoiced,
      unitPrice: line.unitPrice,
      invoiceTotal: line.invoiceTotal,
    });
  };

  const handleEditChange = (field: string, val: any) => {
    setEditValues(prev => ({ ...prev, [field]: val }));
  };

  const saveRowEdit = (line: InvoiceLine) => {
    // Collect exact diff for confirmation
    const changes: string[] = [];
    if (editValues.supplierName !== line.supplierName) {
      changes.push(`Supplier Name: "${line.supplierName}" → "${editValues.supplierName}"`);
    }
    if (editValues.poNumber !== line.poNumber) {
      changes.push(`PO Number: "${line.poNumber}" → "${editValues.poNumber}"`);
    }
    if (Number(editValues.quantityInvoiced) !== line.quantityInvoiced) {
      changes.push(`Quantity: ${line.quantityInvoiced} → ${editValues.quantityInvoiced}`);
    }
    if (Number(editValues.unitPrice) !== line.unitPrice) {
      changes.push(`Unit Price: $${line.unitPrice.toFixed(2)} → $${Number(editValues.unitPrice).toFixed(2)}`);
    }
    if (Number(editValues.invoiceTotal) !== line.invoiceTotal) {
      changes.push(`Invoice Total: $${line.invoiceTotal.toFixed(2)} → $${Number(editValues.invoiceTotal).toFixed(2)}`);
    }

    if (changes.length === 0) {
      setEditingRecordId(null);
      return;
    }

    setConfirmModalData({
      type: "field_edit",
      recordId: line.recordId,
      changes,
      line,
      message: `Are you sure you want to correct the following values for Record ID ${line.recordId}?`
    });
    setShowConfirmModal(true);
  };

  const applyFieldEdit = () => {
    if (!confirmModalData) return;
    const { recordId, line } = confirmModalData;

    const updatedInvoices = existingInvoices.map(inv => {
      if (inv.recordId === recordId) {
        // Construct the updated row with a history stamp
        const mappingHistory = inv.mappingChangeHistory || [];
        confirmModalData.changes.forEach((ch: string) => {
          mappingHistory.push({
            originalColumn: "Human Direct Overwrite",
            previousMappedField: "Original Confirmed Value",
            newMappedField: ch,
            changedBy: "AP Specialist",
            timestamp: new Date().toLocaleString()
          });
        });

        // Determine if PO changed to "Missing PO"
        let finalPo = editValues.poNumber;
        if (!finalPo || finalPo.toLowerCase() === "n/a" || finalPo.trim() === "") {
          finalPo = "Missing PO";
        }

        return {
          ...inv,
          supplierName: editValues.supplierName,
          poNumber: finalPo,
          quantityInvoiced: Number(editValues.quantityInvoiced) || 0,
          unitPrice: Number(editValues.unitPrice) || 0,
          invoiceTotal: Number(editValues.invoiceTotal) || 0,
          grossLineAmount: Number((Number(editValues.quantityInvoiced) * Number(editValues.unitPrice)).toFixed(2)),
          lineAmount: Number((Number(editValues.quantityInvoiced) * Number(editValues.unitPrice)).toFixed(2)),
          mappingChangeHistory: mappingHistory,
          confirmedByHuman: true // Record human verification confirmed
        };
      }
      return inv;
    });

    // Run same-batch duplicate check on the updated batch
    const counts: Record<string, number> = {};
    updatedInvoices.forEach(i => {
      const k = `${i.invoiceNumber}_${i.invoiceDate}_${i.invoiceTotal}`;
      counts[k] = (counts[k] || 0) + 1;
    });

    const finalBatch = updatedInvoices.map(inv => {
      const k = `${inv.invoiceNumber}_${inv.invoiceDate}_${inv.invoiceTotal}`;
      if (counts[k] > 1) {
        return {
          ...inv,
          duplicateStatus: "Exact Duplicate" as const,
          importValidationStatus: "Review Required" as const,
          importValidationReason: `${inv.importValidationReason || ""} | Same-batch Exact Duplicate Invoice detected.`.trim()
        };
      }
      return inv;
    });

    onUpdateInvoices(finalBatch);
    setIsRematchRequired(true);
    setEditingRecordId(null);
    setShowConfirmModal(false);
    setConfirmModalData(null);
  };

  // Manual Addition
  const handleAddManualInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mSupplierName || !mInvoiceNumber || !mPoNumber || !mItemDesc || !mQty || !mPrice) {
      setError("Please fill out all mandatory fields in manual entry form.");
      return;
    }

    const calculatedLineAmt = Number(mQty) * Number(mPrice);
    const calculatedTotal = mTotal !== "" ? Number(mTotal) : calculatedLineAmt;

    const manualLine: InvoiceLine = {
      recordId: `INV-MANUAL-${existingInvoices.length + 1}-${Math.floor(Math.random() * 1000)}`,
      lineNumber: mLineNumber || "1",
      sourceFileName: "Manual Entry",
      sourceWorkbookName: "Manual Entry",
      worksheetOrigin: "Manual Entry Form",
      supplierName: mSupplierName,
      invoiceNumber: mInvoiceNumber,
      invoiceDate: formatDate(mInvoiceDate || new Date().toISOString().slice(0, 10)),
      invoiceDueDate: formatDate(mInvoiceDueDate),
      billTo: "Internal AP",
      poNumber: mPoNumber || "Missing PO",
      itemDescription: mItemDesc,
      quantityInvoiced: Number(mQty),
      unitPrice: Number(mPrice),
      lineAmount: calculatedLineAmt,
      subtotal: calculatedLineAmt,
      gst: 0,
      invoiceTotal: calculatedTotal,
      currency: "USD",
      duplicateStatus: "Clear",
      extractionStatus: "clear",
      fieldsRequiringReview: "",
      importValidationStatus: "Ready for Match",
      importValidationReason: "Manually registered and confirmed by human.",
      dateParserVersion: "v2-date-only",
      extractionNotes: "Manual Entry Override",
    };

    onUpdateInvoices([...existingInvoices, manualLine]);
    setIsRematchRequired(true);

    // Clear Form
    setMItemDesc("");
    setMQty("");
    setMPrice("");
    setMTotal("");
    setError(null);
    setShowManualForm(false);
  };

  const handleDeleteInvoice = (recordId: string) => {
    onUpdateInvoices(existingInvoices.filter(inv => inv.recordId !== recordId));
    setIsRematchRequired(true);
  };

  // Summary Metrics calculations for App 1 review dashboard
  const metrics = React.useMemo(() => {
    const totalLines = existingInvoices.length;
    const uniqueInvoices = new Set(existingInvoices.map(i => i.invoiceNumber).filter(Boolean)).size;

    const ready = existingInvoices.filter(i => i.importValidationStatus === "Ready for Match").length;
    const review = existingInvoices.filter(i => i.importValidationStatus === "Review Required").length;
    const blocked = existingInvoices.filter(i => i.importValidationStatus === "Blocked").length;

    return { totalLines, uniqueInvoices, ready, review, blocked };
  }, [existingInvoices]);

  return (
    <div id="step-1-container" className="space-y-6">

      {/* RENDER ACTIVE IMPORT REVIEW OR TRADITIONAL LEDGER */}
      {existingInvoices.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-sans font-bold tracking-tight text-gray-900">
                  Step 1: Invoice Import Review
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Verify and confirm the joined and parsed invoice data before executing three-way matching.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isApp1Format && (
                <>
                  <button
                    onClick={() => setShowMappingEditor(!showMappingEditor)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3.5 py-2 rounded-lg transition"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                    <span>{showMappingEditor ? "Close Column Mappings" : "Edit Column Mappings"}</span>
                  </button>
                  <button
                    onClick={() => setShowAuditLogs(!showAuditLogs)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3.5 py-2 rounded-lg transition relative"
                  >
                    <History className="h-4 w-4 text-gray-500" />
                    <span>Audit Trail</span>
                    {mappingChangeHistory.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                        {mappingChangeHistory.length}
                      </span>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3.5 py-2 rounded-lg transition"
              >
                <Plus className="h-4 w-4 animate-bounce" />
                <span>Add Row Manually</span>
              </button>
              <button
                onClick={() => setShowReplaceUpload(!showReplaceUpload)}
                className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition"
              >
                {showReplaceUpload ? "Cancel Upload" : "Replace Workbook"}
              </button>
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 px-3.5 py-2 rounded-lg transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete All</span>
              </button>
            </div>
          </div>

          {showDeleteAllConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-5 flex items-start space-x-3">
                  <div className="bg-rose-100 text-rose-600 p-2 rounded-full shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Delete All Invoices</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Are you sure you want to delete all invoice data? This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteAllConfirm(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onUpdateInvoices([]);
                      setSheetsData(null);
                      setShowDeleteAllConfirm(false);
                      setShowReplaceUpload(true);
                    }}
                    className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
                  >
                    Yes, Delete All
                  </button>
                </div>
              </div>
            </div>
          )}

          {duplicateUploadFile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-5 flex items-start space-x-3">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-full shrink-0">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Duplicate Upload Detected</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      The file <strong>{duplicateUploadFile.file.name}</strong> was already uploaded. What would you like to do?
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end space-x-3">
                  <button
                    onClick={() => setDuplicateUploadFile(null)}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      processValidatedFile(duplicateUploadFile.file, duplicateUploadFile.parsed, duplicateUploadFile.isApp1, false);
                      setDuplicateUploadFile(null);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
                  >
                    Keep Existing & Append
                  </button>
                  <button
                    onClick={() => {
                      processValidatedFile(duplicateUploadFile.file, duplicateUploadFile.parsed, duplicateUploadFile.isApp1, true);
                      setDuplicateUploadFile(null);
                    }}
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                  >
                    Replace and Reprocess
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE FILE BANNER */}
          <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Active File: {fileName || "Manual Entry"}</p>
                <p className="text-[10px] text-gray-500">{existingInvoices.length} invoice lines loaded</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowReplaceUpload(true)}
                className="text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded transition shadow-sm"
              >
                Upload New Data
              </button>
            </div>
          </div>

          {/* APP 1 DASHBOARD COUNTER CARDS */}
          {isApp1Format && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <span className="text-[10px] text-gray-400 font-mono block uppercase">Total Invoices</span>
                <span className="text-xl font-bold text-gray-800">{metrics.uniqueInvoices}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <span className="text-[10px] text-gray-400 font-mono block uppercase">Invoice Lines</span>
                <span className="text-xl font-bold text-gray-800">{metrics.totalLines}</span>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-center">
                <span className="text-[10px] text-emerald-600 font-mono block uppercase">Ready for Match</span>
                <span className="text-xl font-bold text-emerald-700">{metrics.ready}</span>
              </div>
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-center">
                <span className="text-[10px] text-amber-600 font-mono block uppercase">Review Required</span>
                <span className="text-xl font-bold text-amber-700">{metrics.review}</span>
              </div>
              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-center col-span-2 md:col-span-1">
                <span className="text-[10px] text-rose-600 font-mono block uppercase">Blocked Records</span>
                <span className="text-xl font-bold text-rose-700">{metrics.blocked}</span>
              </div>
            </div>
          )}

          {/* AUDIT LOG TRAIL (COLLAPSIBLE) */}
          <AnimatePresence>
            {showAuditLogs && isApp1Format && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3"
              >
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1">
                    <History className="h-4 w-4 text-indigo-600" />
                    <span>Schema Adjustment & Direct Override Audit Log</span>
                  </h4>
                  <button onClick={() => setShowAuditLogs(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {mappingChangeHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No adjustments or corrections made in this session yet.</p>
                ) : (
                  <div className="max-h-[150px] overflow-y-auto space-y-2 text-[11px] font-mono">
                    {mappingChangeHistory.map((log, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-gray-200/80 flex justify-between gap-4">
                        <div>
                          <span className="text-indigo-600 font-bold">[{log.changedBy}]</span> changed{" "}
                          <span className="font-semibold text-gray-900">"{log.originalColumn}"</span>:{" "}
                          <span className="text-rose-500 font-medium">"{log.previousMappedField || "Unmapped"}"</span> →{" "}
                          <span className="text-emerald-600 font-bold">"{log.newMappedField}"</span>
                        </div>
                        <div className="text-gray-400 shrink-0 text-right">{log.timestamp}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE SCHEMA COLUMN MAPPING EDITOR (COLLAPSIBLE) */}
          <AnimatePresence>
            {showMappingEditor && isApp1Format && sheetsData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 shadow-3xs"
              >
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Sheet Columns Schema Review & Match Controls
                    </h4>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">AP-1 WORKBOOK MODIFIERS</span>
                  </div>
                  <button onClick={() => setShowMappingEditor(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* TABS SELECTOR */}
                <div className="flex space-x-2 border-b border-slate-200 pb-1">
                  <button
                    onClick={() => setActiveMappingTab("summary")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition ${
                      activeMappingTab === "summary"
                        ? "bg-indigo-600 text-white shadow-3xs"
                        : "bg-slate-150 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Worksheet 1: Invoices Summary ({summaryMappings.length} cols)
                  </button>
                  <button
                    onClick={() => setActiveMappingTab("granular")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition ${
                      activeMappingTab === "granular"
                        ? "bg-indigo-600 text-white shadow-3xs"
                        : "bg-slate-150 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Worksheet 2: Granular Line Items ({granularMappings.length} cols)
                  </button>
                </div>

                <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-3xs">
                  <table className="min-w-full divide-y divide-slate-150 text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold font-mono tracking-wider text-[9px]">
                        <th className="px-3 py-2.5">Original Column</th>
                        <th className="px-3 py-2.5">Mapped App Field</th>
                        <th className="px-3 py-2.5">Sample Value</th>
                        <th className="px-3 py-2.5">Field Requirement</th>
                        <th className="px-3 py-2.5">Use in Matching</th>
                        <th className="px-3 py-2.5">Compare Against</th>
                        <th className="px-3 py-2.5">Mapping Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(activeMappingTab === "summary" ? summaryMappings : granularMappings).map((m, idx) => {
                        const sheetType = activeMappingTab;
                        const isCoreMatchField = m.suggestedField && [
                          "invoiceNumber", "poNumber", "supplierName", "itemDescription", "quantityInvoiced", "unitPrice"
                        ].includes(m.suggestedField);

                        const compatTargets = getCompatibleCompareTargets(m.suggestedField, poLines, grnLines);
                        const isCompatAvailable = compatTargets.length > 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            {/* 1. Original Column */}
                            <td className="px-3 py-2 font-semibold text-slate-800 font-mono truncate max-w-[150px]" title={m.originalColumn}>
                              {m.originalColumn}
                            </td>

                            {/* 2. Mapped App Field */}
                            <td className="px-3 py-2">
                              <select
                                value={m.suggestedField || ""}
                                onChange={(e) => {
                                  const val = e.target.value || null;
                                  handleUpdateMappingControl(sheetType, m.originalColumn, "suggestedField", val);
                                }}
                                className="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-[11px]"
                              >
                                <option value="">-- Ignore Column --</option>
                                {sheetType === "summary" ? (
                                  <>
                                    <option value="invoiceNumber">Invoice Number *</option>
                                    <option value="invoiceDate">Invoice Date *</option>
                                    <option value="invoiceDueDate">Due Date</option>
                                    <option value="poNumber">PO Number *</option>
                                    <option value="invoiceTotal">Invoice Total (Final Payable) *</option>
                                    <option value="subtotal">Invoice Subtotal *</option>
                                    <option value="invoiceLevelDiscount">Total Discount *</option>
                                    <option value="invoiceTax">Total Tax (GST) *</option>
                                    <option value="additionalCharges">Delivery/Additional Charges</option>
                                    <option value="supplierName">Supplier Name *</option>
                                    <option value="currency">Currency *</option>
                                    <option value="supplierAddress">Supplier Address</option>
                                    <option value="paymentTerms">Payment Terms</option>
                                    <option value="bankDetails">Bank Details</option>
                                    <option value="bankAccountIban">Bank Account / IBAN</option>
                                    <option value="amountAlreadyPaid">Amount Already Paid</option>
                                    <option value="outstandingBalance">Outstanding Balance</option>
                                    <option value="supplierContactDetails">Supplier Contact Details</option>
                                    <option value="businessRegTaxId">Business Reg / Tax ID</option>
                                    <option value="acceptedPaymentMethod">Accepted Payment Method</option>
                                    <option value="latePaymentTerms">Late Payment Terms</option>
                                    <option value="sourceFileName">Source File Name</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="granularInvoiceNumber">Invoice Number *</option>
                                    <option value="itemDescription">Product/Service Description *</option>
                                    <option value="quantityInvoiced">Quantity *</option>
                                    <option value="unitPrice">Unit Price *</option>
                                    <option value="lineDiscount">Discount (Item) *</option>
                                    <option value="lineTaxRate">Tax Rate (%)</option>
                                    <option value="lineTax">Tax Amount (Item) *</option>
                                    <option value="netLineTotal">Total Amount (Net Line Total) *</option>
                                    <option value="supplierName">Supplier Name</option>
                                    <option value="currency">Currency</option>
                                  </>
                                )}
                              </select>
                            </td>

                            {/* 3. Sample Value */}
                            <td className="px-3 py-2 text-slate-500 font-mono max-w-[120px] truncate" title={m.sampleValue}>
                              {m.sampleValue}
                            </td>

                            {/* 4. Field Requirement */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              {isCoreMatchField ? (
                                <span className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  Mandatory Match Control
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  Optional Supporting Info
                                </span>
                              )}
                            </td>

                            {/* 5. Use in Matching */}
                            <td className="px-3 py-2">
                              {isCoreMatchField ? (
                                <span className="text-slate-500 font-bold font-mono">Required Match</span>
                              ) : (
                                <select
                                  disabled={!isCompatAvailable}
                                  value={isCompatAvailable ? (m.useInMatching || "Reference Only") : "Reference Only"}
                                  onChange={(e) => handleUpdateMappingControl(sheetType, m.originalColumn, "useInMatching", e.target.value)}
                                  className="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 font-sans font-medium"
                                >
                                  <option value="Required Match">Required Match</option>
                                  <option value="Optional Check">Optional Check</option>
                                  <option value="Reference Only">Reference Only</option>
                                </select>
                              )}
                            </td>

                            {/* 6. Compare Against */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              {isCoreMatchField ? (
                                <span className="font-mono text-indigo-600/80 font-semibold bg-indigo-50/40 border border-indigo-100/30 px-1.5 py-0.5 rounded">
                                  {m.suggestedField === "poNumber" && "po.poNumber"}
                                  {m.suggestedField === "supplierName" && "po.supplier"}
                                  {m.suggestedField === "itemDescription" && "po.itemDescription"}
                                  {m.suggestedField === "quantityInvoiced" && "po.quantityOrdered / grn.quantityReceived"}
                                  {m.suggestedField === "unitPrice" && "po.unitPrice"}
                                </span>
                              ) : isCompatAvailable ? (
                                <select
                                  value={m.compareAgainst || ""}
                                  onChange={(e) => handleUpdateMappingControl(sheetType, m.originalColumn, "compareAgainst", e.target.value || null)}
                                  className="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                                >
                                  {compatTargets.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px] italic">No comparison field available</span>
                              )}
                            </td>

                            {/* 7. Mapping Status */}
                            <td className="px-3 py-2">
                              {m.status === "automatically mapped" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  ● Mapped
                                </span>
                              ) : m.status === "confirmation required" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                  ● Review
                                </span>
                              ) : m.status === "ignored" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-105 text-slate-500">
                                  ● Ignored
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                  ● Unmapped
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DATE STANDARDISATION REVIEW PANEL */}
          <div id="date-standardisation-panel" className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">
                    Date Standardisation Audit & Review
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Automatically standardises, detects formats, and manages ambiguous date values column-wide.
                  </p>
                </div>
              </div>

              {/* STATS BADGE & FILTER */}
              <div className="flex flex-wrap items-center gap-2">
                {dateStandardisations.some(s => s.reviewStatus === "Confirmation Required") && (
                  <span className="flex items-center space-x-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded">
                    <AlertTriangle className="h-3 w-3 text-amber-600 animate-bounce" />
                    <span>{dateStandardisations.filter(s => s.reviewStatus === "Confirmation Required").length} Action Required</span>
                  </span>
                )}
                
                {/* TAB FILTERS */}
                <div className="flex space-x-1 bg-slate-200 p-0.5 rounded-lg">
                  {["All", "Invoices Summary", "PO Lines", "GRN Lines"].map(tab => {
                    const count = tab === "All" 
                      ? dateStandardisations.length 
                      : dateStandardisations.filter(s => s.worksheet === tab).length;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDateFilterTab(tab)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                          dateFilterTab === tab
                            ? "bg-white text-slate-900 shadow-3xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab === "All" ? "Show All" : tab.replace(" Summary", "").replace(" Lines", "")} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BULK COLUMN FORMATTING CARD */}
            {dateStandardisations.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs shadow-3xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-1">
                    <span>⚡ Column-Wide Force Format</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Enforce a day-first (DD/MM) or month-first (MM/DD) format and bulk-approve all ambiguous values in a column.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkConfirmWorksheet}
                    onChange={(e) => {
                      setBulkConfirmWorksheet(e.target.value);
                      setBulkConfirmColumn("");
                    }}
                    className="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px]"
                  >
                    <option value="">-- Choose Worksheet --</option>
                    <option value="Invoices Summary">Invoices Summary</option>
                    <option value="PO Lines">PO Lines</option>
                    <option value="GRN Lines">GRN Lines</option>
                  </select>

                  <select
                    disabled={!bulkConfirmWorksheet}
                    value={bulkConfirmColumn}
                    onChange={(e) => setBulkConfirmColumn(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">-- Choose Column --</option>
                    {Array.from(new Set(
                      dateStandardisations
                        .filter(s => s.worksheet === bulkConfirmWorksheet)
                        .map(s => s.originalColumn)
                    )).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>

                  <select
                    disabled={!bulkConfirmColumn}
                    value={bulkConfirmScheme}
                    onChange={(e) => setBulkConfirmScheme(e.target.value as any)}
                    className="border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] disabled:bg-slate-50"
                  >
                    <option value="day-first">Day-First (DD/MM/YYYY)</option>
                    <option value="month-first">Month-First (MM/DD/YYYY)</option>
                  </select>

                  <button
                    type="button"
                    disabled={!bulkConfirmColumn}
                    onClick={() => {
                      handleBulkConfirmColumnFormat(bulkConfirmWorksheet, bulkConfirmColumn, bulkConfirmScheme);
                      alert(`Successfully bulk-confirmed ${bulkConfirmColumn} column as ${bulkConfirmScheme === "day-first" ? "Day-First" : "Month-First"}.`);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded text-[11px] disabled:bg-slate-100 disabled:text-slate-400 transition"
                  >
                    Bulk Confirm Format
                  </button>
                </div>
              </div>
            )}

            {/* AUDIT LIST TABLE */}
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-150 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase font-bold font-mono tracking-wider text-[9px] sticky top-0 z-10">
                    <th className="px-3 py-2">Worksheet</th>
                    <th className="px-3 py-2">Column / ID</th>
                    <th className="px-3 py-2">Original Value</th>
                    <th className="px-3 py-2">Detected Scheme</th>
                    <th className="px-3 py-2">Standardised Date</th>
                    <th className="px-3 py-2">Audit Trace Info</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-right">Actions / Correction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dateStandardisations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-slate-400 italic">
                        No dates extracted for standardisation yet. Upload an Excel file or load records to begin.
                      </td>
                    </tr>
                  ) : (
                    dateStandardisations
                      .filter(rec => dateFilterTab === "All" || rec.worksheet === dateFilterTab)
                      .map((rec) => {
                        const isEditingThis = editingDateRecordId === rec.id;
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Worksheet */}
                            <td className="px-3 py-2 font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec.worksheet === "Invoices Summary" 
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                                  : rec.worksheet === "PO Lines" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                  : "bg-purple-50 text-purple-700 border border-purple-100"
                              }`}>
                                {rec.worksheet.replace(" Summary", "").replace(" Lines", "")}
                              </span>
                            </td>

                            {/* Column & ID */}
                            <td className="px-3 py-2 text-slate-700">
                              <div className="font-mono font-medium text-[10px]">{rec.originalColumn}</div>
                              <div className="text-[9px] text-slate-400 truncate max-w-[120px]" title={rec.recordId}>ID: {rec.recordId}</div>
                            </td>

                            {/* Original Value */}
                            <td className="px-3 py-2 font-mono text-slate-600 font-semibold">
                              {rec.originalValue}
                            </td>

                            {/* Detected Scheme */}
                            <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                              {rec.detectedFormat}
                            </td>

                            {/* Standardised Date */}
                            <td className="px-3 py-2 font-bold text-slate-900">
                              {isEditingThis ? (
                                <input
                                  type="text"
                                  value={dateCorrectionValue}
                                  onChange={(e) => setDateCorrectionValue(e.target.value)}
                                  placeholder="DD/MM/YYYY"
                                  className="border border-indigo-300 rounded px-1.5 py-0.5 w-24 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className={rec.standardisedDate === "INVALID" ? "text-rose-600 font-bold" : "text-indigo-700 font-bold"}>
                                  {formatDisplayDate(rec.standardisedDate)}
                                </span>
                              )}
                            </td>

                            {/* Audit Trace Info */}
                            <td className="px-3 py-2 text-[10px] text-slate-500">
                              <div>Method: {rec.detectionMethod}</div>
                              {rec.confirmedBy && (
                                <div className="text-emerald-600 font-medium">
                                  ✓ Confirmed by {rec.confirmedBy}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                rec.reviewStatus === "Automatically Standardised"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                                  : rec.reviewStatus === "Confirmation Required"
                                  ? "bg-amber-50 text-amber-700 border-amber-150 animate-pulse"
                                  : rec.reviewStatus === "Human Corrected"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-150"
                                  : "bg-rose-50 text-rose-700 border-rose-150"
                              }`}>
                                {rec.reviewStatus}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="flex justify-end items-center space-x-1.5">
                                {isEditingThis ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleCorrectDateRecord(rec.id, dateCorrectionValue)}
                                      className="text-emerald-600 hover:text-emerald-800 font-bold text-[10px] bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded"
                                      title="Save custom date value"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingDateRecordId(null)}
                                      className="text-slate-400 hover:text-slate-600 font-bold text-[10px] bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {rec.reviewStatus === "Confirmation Required" && (
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmDateRecord(rec.id)}
                                        className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-100 flex items-center space-x-0.5"
                                        title="Approve detected date value"
                                      >
                                        <Check className="h-3 w-3" />
                                        <span>Confirm</span>
                                      </button>
                                    )}

                                    {rec.alternativeInterpretation && (
                                      <button
                                        type="button"
                                        onClick={() => handleSwapDateInterpretation(rec.id)}
                                        className="text-amber-700 hover:text-amber-900 font-bold text-[10px] bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-100 flex items-center space-x-0.5"
                                        title={`Swap components (e.g. to ${formatDisplayDate(rec.alternativeInterpretation)})`}
                                      >
                                        <RefreshCw className="h-2.5 w-2.5 animate-spin-hover" />
                                        <span>Swap ({formatDisplayDate(rec.alternativeInterpretation)})</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDateRecordId(rec.id);
                                        setDateCorrectionValue(rec.standardisedDate === "INVALID" ? "" : rec.standardisedDate);
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-150"
                                      title="Type custom DD/MM/YYYY date"
                                    >
                                      Correct
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ACTIVE STEP 1 REVIEW TABLE */}
          <div className="overflow-x-auto border border-gray-150 rounded-xl max-h-[480px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-150 text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase font-bold font-mono tracking-wider text-[10px]">
                  <th className="px-4 py-3 shrink-0">Record ID</th>
                  <th className="px-4 py-3">Invoice / Line</th>
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">PO Reference</th>
                  <th className="px-4 py-3">Item Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Gross Amount</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Line Tax</th>
                  <th className="px-4 py-3 text-right">Expected Net</th>
                  <th className="px-4 py-3 text-right">Header Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Validation Details</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {existingInvoices.map((inv) => {
                  const isEditing = editingRecordId === inv.recordId;
                  const isBlocked = inv.importValidationStatus === "Blocked";
                  const isReview = inv.importValidationStatus === "Review Required";

                  return (
                    <tr 
                      key={inv.recordId} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isBlocked ? "bg-red-50/30" : isReview ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Record ID */}
                      <td className="px-4 py-3.5 font-mono text-[10px] text-gray-400 font-semibold align-middle shrink-0">
                        {inv.recordId}
                      </td>

                      {/* Invoice / Line */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-bold text-gray-900 font-mono">#{inv.invoiceNumber || "N/A"}</div>
                        <div className="text-[10px] text-gray-400">Line {inv.lineNumber}</div>
                      </td>

                      {/* Supplier Name */}
                      <td className="px-4 py-3.5 align-middle">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.supplierName}
                            onChange={(e) => handleEditChange("supplierName", e.target.value)}
                            className="border border-gray-300 rounded px-1.5 py-1 w-28 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                          />
                        ) : (
                          <div className="font-semibold text-gray-900">{inv.supplierName || "N/A"}</div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3.5 align-middle text-gray-600 leading-tight">
                        <div><span className="text-[10px] text-gray-400 font-mono">INV:</span> {formatStoredDateForDisplay(inv.invoiceDate)}</div>
                        {inv.invoiceDueDate && (
                          <div><span className="text-[10px] text-gray-400 font-mono">DUE:</span> {formatStoredDateForDisplay(inv.invoiceDueDate)}</div>
                        )}
                      </td>

                      {/* PO Reference */}
                      <td className="px-4 py-3.5 align-middle">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.poNumber}
                            onChange={(e) => handleEditChange("poNumber", e.target.value)}
                            placeholder="PO Number"
                            className="border border-gray-300 rounded px-1.5 py-1 w-24 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        ) : (
                          <span className={`font-mono px-2 py-0.5 rounded font-semibold text-[11px] ${
                            inv.poNumber === "Missing PO" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-100 text-slate-800"
                          }`}>
                            {inv.poNumber}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3.5 align-middle text-gray-500 truncate max-w-xs font-mono text-[11px]" title={inv.itemDescription}>
                        {inv.itemDescription || "N/A"}
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3.5 align-middle text-right font-medium text-gray-900">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.quantityInvoiced}
                            onChange={(e) => handleEditChange("quantityInvoiced", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-1 w-14 bg-white text-right"
                          />
                        ) : (
                          inv.quantityInvoiced
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3.5 align-middle text-right font-semibold text-gray-600">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.unitPrice}
                            onChange={(e) => handleEditChange("unitPrice", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-1 w-16 bg-white text-right"
                          />
                        ) : (
                          formatMoney(inv.unitPrice, inv.currency)
                        )}
                      </td>

                      {/* Gross Amount */}
                      <td className="px-4 py-3.5 align-middle text-right font-medium text-slate-600">
                        {formatMoney(inv.grossLineAmount || (inv.quantityInvoiced * inv.unitPrice), inv.currency)}
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3.5 align-middle text-right text-gray-500">
                        {formatMoney(inv.lineDiscount || 0, inv.currency)}
                      </td>

                      {/* Line Tax */}
                      <td className="px-4 py-3.5 align-middle text-right text-gray-500">
                        {formatMoney(inv.lineTax || 0, inv.currency)}
                      </td>

                      {/* Expected Net */}
                      <td className="px-4 py-3.5 align-middle text-right font-bold text-gray-900">
                        {formatMoney(inv.netLineTotal || (inv.grossLineAmount || 0), inv.currency)}
                      </td>

                      {/* Header Total */}
                      <td className="px-4 py-3.5 align-middle text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.invoiceTotal}
                            onChange={(e) => handleEditChange("invoiceTotal", e.target.value)}
                            className="border border-gray-300 rounded px-1 py-1 w-20 bg-white text-right font-bold"
                          />
                        ) : (
                          <div className="font-bold text-gray-900">{formatMoney(inv.invoiceTotal, inv.currency)}</div>
                        )}
                      </td>

                      {/* Validation Status Badge */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.importValidationStatus === "Blocked"
                            ? "bg-rose-50 text-rose-700 border-rose-150"
                            : inv.importValidationStatus === "Review Required"
                            ? "bg-amber-50 text-amber-700 border-amber-150"
                            : "bg-emerald-50 text-emerald-700 border-emerald-150"
                        }`}>
                          {inv.importValidationStatus}
                        </span>
                      </td>

                      {/* Detailed Explanatory Reason */}
                      <td className="px-4 py-3.5 align-middle max-w-xs text-[10px] text-gray-500 font-medium leading-relaxed">
                        {inv.importValidationReason || "No anomalies flagged."}
                      </td>

                      {/* Edit Actions */}
                      <td className="px-4 py-3.5 align-middle text-right">
                        <div className="flex justify-end space-x-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveRowEdit(inv)}
                                className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 transition"
                                title="Save corrections"
                              >
                                <Save className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => setEditingRecordId(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                title="Cancel"
                              >
                                <X className="h-4.5 w-4.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(inv)}
                                className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition"
                                title="Correct field values"
                              >
                                <Edit2 className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(inv.recordId)}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                                title="Delete row"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* WARNING NOTIFICATION & PROCEED */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-gray-100 pt-5 gap-4">
            <div className="text-xs text-gray-500 leading-relaxed max-w-2xl">
              {metrics.blocked > 0 ? (
                <div className="flex items-start space-x-2 text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Blocked Items Exist:</strong> You cannot proceed to the matching pool because {metrics.blocked} records contain structural or key parameter errors. Correct them above or upload a clean workbook.
                  </span>
                </div>
              ) : metrics.review > 0 ? (
                <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Review Required Warnings:</strong> {metrics.review} records require audit verification due to calculation or vendor name differences. You can still proceed, but these anomalies will carry over into matching.
                  </span>
                </div>
              ) : (
                <div className="flex items-start space-x-2 text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Validation Cleared:</strong> All records are structurally verified and ready for matching.
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 shrink-0">
              {isRematchRequired && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded animate-pulse">
                  REMATCH REQUIRED ON SAVE
                </span>
              )}
              <button
                disabled={metrics.blocked > 0}
                onClick={() => {
                  // If we are confirming, rebuild matching snap
                  onInvoicesLoaded(existingInvoices, fileName || "Excel Upload");
                  // Mark rematch as clean now that we loaded the confirmed set
                  setIsRematchRequired(false);
                }}
                className={`flex items-center space-x-2 text-xs font-semibold px-6 py-3 rounded-xl shadow-md transition-all duration-150 cursor-pointer ${
                  metrics.blocked > 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg"
                }`}
              >
                <span>Confirm & Proceed to PO/GRN Pool</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE MANUAL INVOICE ROW FORM */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center space-x-1.5">
                  <Plus className="h-4 w-4 text-indigo-600" />
                  <span>Manually Register New Invoice Line</span>
                </h3>
                <button onClick={() => setShowManualForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddManualInvoice} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={mSupplierName}
                    onChange={(e) => setMSupplierName(e.target.value)}
                    placeholder="e.g. Acme Industrial"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={mInvoiceNumber}
                    onChange={(e) => setMInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-9908"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={mInvoiceDate}
                    onChange={(e) => setMInvoiceDate(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">PO Reference (leave blank if missing)</label>
                  <input
                    type="text"
                    value={mPoNumber}
                    onChange={(e) => setMPoNumber(e.target.value)}
                    placeholder="e.g. PO-771"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Item Description *</label>
                  <input
                    type="text"
                    required
                    value={mItemDesc}
                    onChange={(e) => setMItemDesc(e.target.value)}
                    placeholder="e.g. 10kW Generator Repair Kit"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Line Number</label>
                  <input
                    type="text"
                    value={mLineNumber}
                    onChange={(e) => setMLineNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantity Invoiced *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={mQty}
                    onChange={(e) => setMQty(e.target.value !== "" ? parseInt(e.target.value) : "")}
                    placeholder="e.g. 5"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit Price ($) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={mPrice}
                    onChange={(e) => setMPrice(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                    placeholder="e.g. 150.00"
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Invoice Total Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mTotal}
                    onChange={(e) => setMTotal(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                    placeholder={mQty !== "" && mPrice !== "" ? `Auto: $${(Number(mQty) * Number(mPrice)).toFixed(2)}` : "e.g. 750.00"}
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={mInvoiceDueDate}
                    onChange={(e) => setMInvoiceDueDate(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition cursor-pointer text-center"
                  >
                    Insert Invoice Line
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXCEL UPLOADER & SCHEMA ALIGNER PANEL */}
      {showReplaceUpload && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-md font-sans font-bold text-gray-900">
            {existingInvoices.length > 0 ? "Upload Alternative Invoice Registry" : "Step 1: Import Invoices Register"}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Upload the master Invoice workbook. The system detects sheets containing <strong>Invoices Summary</strong> and <strong>Granular Line Items</strong>, performs 3-way joins on Invoice Numbers, and suggestions standard schemas instantly.
          </p>

          <div
            id="drag-drop-zone"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive ? "border-indigo-500 bg-indigo-50/20" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-gray-800">Select or Drop Excel Workbook Here</p>
            <p className="text-[10px] text-gray-400 mt-1">Supports standard App 1 Multi-Sheet or General Single-Sheet layouts (.xlsx, .xls)</p>
          </div>

          {/* Sandbox testing template */}
          <div className="bg-amber-50 border border-amber-100/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">AP Auditor Sandbox Staging</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">Generate and download standard template spreadsheets representing App 1 format with direct joins and exceptions.</p>
              </div>
            </div>
            <button
              onClick={downloadSampleInvoiceRegister}
              className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-100 px-3 py-2 rounded-lg shrink-0 shadow-2xs hover:shadow transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get App 1 Sample Workbook</span>
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-6 space-y-2 text-xs">
              <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
              <p className="font-semibold text-gray-600">Rebuilding multi-sheet tables and running reconciliation checks...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* SINGLE WORKsheet FLEXIBLE SCHEMA ALIGNER (Only shown for non-App1 legacy sheets) */}
      {!isApp1Format && mappings.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Legacy Column Schema Mapper</h3>
            <p className="text-xs text-gray-500 mt-0.5">Please align the columns from your sheet to our target standard fields.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Original Column</th>
                  <th className="px-4 py-2.5">Target Field</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Sample Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{m.originalColumn}</td>
                    <td className="px-4 py-3">
                      <select
                        value={m.suggestedField || ""}
                        onChange={(e) => updateSingleSheetMapping(m.originalColumn, e.target.value || null)}
                        className="border border-gray-200 rounded p-1 text-xs"
                      >
                        <option value="">-- Ignore --</option>
                        {TARGET_INVOICE_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label} {f.required ? "*" : ""}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 uppercase text-[10px] font-bold text-gray-400">{m.status}</td>
                    <td className="px-4 py-3 text-gray-500 italic">{m.sampleValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              onClick={handleConfirmSingleSheetMappings}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Load Parsed Rows
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION WORKFLOW MODAL */}
      <AnimatePresence>
        {showConfirmModal && confirmModalData && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100 space-y-4"
            >
              <div className="flex items-start space-x-3 text-indigo-900">
                <div className="bg-indigo-50 p-2 rounded-xl text-indigo-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Audit Action Confirmation</h3>
                  <p className="text-xs text-gray-500 mt-1">{confirmModalData.message}</p>
                </div>
              </div>

              {confirmModalData.type === "field_edit" && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[11px] text-gray-700 space-y-1">
                  {confirmModalData.changes.map((ch: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-1">
                      <span className="text-indigo-600">•</span>
                      <span>{ch}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-indigo-800 font-bold mt-2 animate-pulse">
                    Note: This triggers auto-recalculation & marks match results as outdated.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100 text-xs">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmModalData(null);
                  }}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModalData.type === "mapping" ? applyMappingChange : applyFieldEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Apply Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ----------------------------------------------------------------------
// Core Helper function: Join and Validation Engine for App 1 Workbook
// ----------------------------------------------------------------------
export function buildAndValidateApp1Invoices(
  sheets: any,
  summaryMappings: ColumnMapping[],
  granularMappings: ColumnMapping[],
  fileName: string,
  date1904: boolean,
  fileSize: number
): InvoiceLine[] {
  const summaryRows = sheets["Invoices Summary"]?.rows || [];
  const granularRows = sheets["Granular Line Items"]?.rows || [];

  // Count summary occurrences to identify duplicate summary records
  const sInvNumCol = summaryMappings.find(m => m.suggestedField === "invoiceNumber")?.originalColumn || "Invoice Number";
  const summaryInvoiceCount: Record<string, number> = {};
  summaryRows.forEach((row: any) => {
    const invNum = String(row[sInvNumCol] || "").trim();
    if (invNum) {
      summaryInvoiceCount[invNum] = (summaryInvoiceCount[invNum] || 0) + 1;
    }
  });

  const builtLines: InvoiceLine[] = [];
  const invoiceLineCounters: Record<string, number> = {};

  // Find standard column suggestions
  const gInvNumCol = granularMappings.find(m => m.suggestedField === "granularInvoiceNumber" || m.suggestedField === "invoiceNumber")?.originalColumn || "Invoice Number";
  const gDescCol = granularMappings.find(m => m.suggestedField === "itemDescription")?.originalColumn || "Product / Service Description";
  const gQtyCol = granularMappings.find(m => m.suggestedField === "quantity")?.originalColumn || "Quantity";
  const gPriceCol = granularMappings.find(m => m.suggestedField === "unitPrice")?.originalColumn || "Unit Price";
  const gDiscCol = granularMappings.find(m => m.suggestedField === "lineDiscount")?.originalColumn || "Discount (Item)";
  const gTaxRateCol = granularMappings.find(m => m.suggestedField === "lineTaxRate")?.originalColumn || "Tax Rate (%)";
  const gTaxCol = granularMappings.find(m => m.suggestedField === "lineTax")?.originalColumn || "Tax Amount (Item)";
  const gTotalCol = granularMappings.find(m => m.suggestedField === "netLineTotal")?.originalColumn || "Total Amount";

  granularRows.forEach((gRow: any, gIdx: number) => {
    const invoiceNumber = String(gRow[gInvNumCol] || "").trim();
    const recordId = `INV-APP1-${gIdx + 1}`;

    const line: Partial<InvoiceLine> = {
      recordId,
      lineNumber: "1",
      sourceFileName: fileName || "App 1 Excel",
      sourceFileSize: fileSize,
      sourceWorkbookName: fileName || "App 1 Excel",
      worksheetOrigin: "Invoices Summary & Granular Line Items",
      dateParserVersion: "v2-date-only",
      originalGranularRow: gRow,
    };

    // Extract granular values mapped
    let qty = 0;
    let price = 0;
    let disc = 0;
    let taxRate = 0;
    let tax = 0;
    let netTotal = 0;
    let desc = "";
    let gSourceFileName = "";

    granularMappings.forEach(m => {
      const col = m.originalColumn;
      const fKey = m.suggestedField;
      const val = gRow[col];

      if (fKey === "itemDescription") desc = String(val || "").trim();
      else if (fKey === "quantityInvoiced") qty = Number(val) || 0;
      else if (fKey === "unitPrice") price = formatCurrencyValue(val);
      else if (fKey === "lineDiscount") disc = formatCurrencyValue(val);
      else if (fKey === "lineTaxRate") taxRate = Number(val) || 0;
      else if (fKey === "lineTax") tax = formatCurrencyValue(val);
      else if (fKey === "netLineTotal") netTotal = formatCurrencyValue(val);
      else if (fKey === "sourceFileName") gSourceFileName = String(val || "").trim();
    });

    line.invoiceNumber = invoiceNumber;
    line.itemDescription = desc;
    line.quantityInvoiced = qty;
    line.unitPrice = price;
    line.lineDiscount = disc;
    line.lineTaxRate = taxRate;
    line.lineTax = tax;
    line.netLineTotal = netTotal;

    // Gross and Net Expected calculations
    const grossLineAmount = Number((qty * price).toFixed(2));
    const expectedNetLineTotal = Number((grossLineAmount - disc + tax).toFixed(2));

    line.grossLineAmount = grossLineAmount;
    line.lineAmount = grossLineAmount; // compat mapping
    line.expectedNetLineTotal = expectedNetLineTotal;

    // Find summary Row
    const sRow = summaryRows.find((r: any) => String(r[sInvNumCol] || "").trim() === invoiceNumber);

    let validationErrors: string[] = [];
    let validationWarnings: string[] = [];

    // Basic granular checks
    if (!invoiceNumber) validationErrors.push("Granular line is missing Invoice Number.");
    if (!desc) validationErrors.push("Granular line is missing Item Description.");
    if (isNaN(qty) || qty < 0) validationErrors.push(`Invalid Quantity value: ${qty}`);
    if (isNaN(price) || price < 0) validationErrors.push(`Invalid Unit Price value: ${price}`);

    if (!sRow) {
      validationErrors.push(`Unmatched granular row: No matching summary record found for Invoice Number "${invoiceNumber}".`);
    } else {
      line.originalSummaryRow = sRow;

      // Extract summary values
      let sSupplierName = "";
      let sInvoiceDate = "";
      let sDueDate = "";
      let sPoNumber = "";
      let sInvoiceTotal = 0;
      let sSubtotal = 0;
      let sInvoiceLevelDiscount = 0;
      let sInvoiceTax = 0;
      let sAdditionalCharges = 0;
      let sCurrency = "USD";

      let sSupplierAddress = "";
      let sPaymentTerms = "";
      let sBankDetails = "";
      let sBankAccountIban = "";
      let sPaymentReference = "";
      let sAmountPaid = 0;
      let sBalance = 0;
      let sSupplierContactDetails = "";
      let sBusinessRegTaxId = "";
      let sAcceptedPaymentMethod = "";
      let sLatePaymentTerms = "";
      let sSourceFileName = "";

      summaryMappings.forEach(m => {
        const col = m.originalColumn;
        const fKey = m.suggestedField;
        const val = sRow[col];

        if (fKey === "supplierName") sSupplierName = String(val || "").trim();
        else if (fKey === "invoiceDate") sInvoiceDate = formatDate(val, date1904);
        else if (fKey === "invoiceDueDate") sDueDate = formatDate(val, date1904);
        else if (fKey === "poNumber") sPoNumber = String(val || "").trim();
        else if (fKey === "invoiceTotal") sInvoiceTotal = formatCurrencyValue(val);
        else if (fKey === "subtotal") sSubtotal = formatCurrencyValue(val);
        else if (fKey === "invoiceLevelDiscount") sInvoiceLevelDiscount = formatCurrencyValue(val);
        else if (fKey === "invoiceTax") sInvoiceTax = formatCurrencyValue(val);
        else if (fKey === "additionalCharges") sAdditionalCharges = formatCurrencyValue(val);
        else if (fKey === "currency") sCurrency = String(val || "").trim();
        else if (fKey === "supplierAddress") sSupplierAddress = String(val || "").trim();
        else if (fKey === "paymentTerms") sPaymentTerms = String(val || "").trim();
        else if (fKey === "bankDetails") sBankDetails = String(val || "").trim();
        else if (fKey === "bankAccountIban") sBankAccountIban = String(val || "").trim();
        else if (fKey === "paymentReference") sPaymentReference = String(val || "").trim();
        else if (fKey === "amountAlreadyPaid") sAmountPaid = formatCurrencyValue(val);
        else if (fKey === "outstandingBalance") sBalance = formatCurrencyValue(val);
        else if (fKey === "supplierContactDetails") sSupplierContactDetails = String(val || "").trim();
        else if (fKey === "businessRegTaxId") sBusinessRegTaxId = String(val || "").trim();
        else if (fKey === "acceptedPaymentMethod") sAcceptedPaymentMethod = String(val || "").trim();
        else if (fKey === "latePaymentTerms") sLatePaymentTerms = String(val || "").trim();
        else if (fKey === "sourceFileName") sSourceFileName = String(val || "").trim();
      });

      // Line counter
      const currCount = (invoiceLineCounters[invoiceNumber] || 0) + 1;
      invoiceLineCounters[invoiceNumber] = currCount;
      line.lineNumber = String(currCount);

      line.supplierName = sSupplierName;
      line.invoiceDate = sInvoiceDate;
      line.invoiceDueDate = sDueDate;
      line.invoiceTotal = sInvoiceTotal;
      line.subtotal = sSubtotal;
      line.gst = sInvoiceTax;
      line.currency = sCurrency || "USD";

      // PO Missing retention
      if (!sPoNumber || sPoNumber.toLowerCase() === "n/a" || sPoNumber.toLowerCase() === "blank" || sPoNumber.trim() === "") {
        line.poNumber = "Missing PO";
        validationWarnings.push("Missing PO Reference: Retained as 'Missing PO' (reconciliation places on hold).");
      } else {
        line.poNumber = sPoNumber;
      }

      line.supplierAddress = sSupplierAddress;
      line.paymentTerms = sPaymentTerms;
      line.bankDetails = sBankDetails;
      line.bankAccountOrIban = sBankAccountIban;
      line.paymentReference = sPaymentReference || "N/A";
      line.supplierContactDetails = sSupplierContactDetails;
      line.businessRegTaxId = sBusinessRegTaxId;
      line.acceptedPaymentMethod = sAcceptedPaymentMethod;
      line.latePaymentTerms = sLatePaymentTerms;
      line.sourceFileName = sSourceFileName || gSourceFileName || "N/A";
      line.sourceWorkbookName = fileName || "App 1 Excel";

      line.extractionNotes = `Automatically matched worksheets on Invoice Number. Origin: Invoices Summary & Granular Line Items`;

      // Header fields validation
      if (!sSupplierName) validationErrors.push("Summary record is missing Supplier Name.");
      if (!sInvoiceDate) validationErrors.push("Summary record is missing Invoice Date.");
      if (!sCurrency) validationErrors.push("Summary record is missing Currency.");
      if (isNaN(sInvoiceTotal) || sInvoiceTotal < 0) validationErrors.push(`Summary record has invalid Invoice Total: ${sInvoiceTotal}`);

      // Compare worksheets supplier and currency
      const gSupplierCol = granularMappings.find(m => m.suggestedField === "supplierName")?.originalColumn || "Supplier Name";
      const gSupplierRaw = String(gRow[gSupplierCol] || "").trim();
      if (gSupplierRaw && sSupplierName && sSupplierName.toLowerCase() !== gSupplierRaw.toLowerCase()) {
        validationWarnings.push(`Supplier Name Mismatch: Summary claims "${sSupplierName}", Granular claims "${gSupplierRaw}". Human review required.`);
      }

      const gCurrencyCol = granularMappings.find(m => m.suggestedField === "currency")?.originalColumn || "Currency";
      const gCurrencyRaw = String(gRow[gCurrencyCol] || "").trim();
      if (gCurrencyRaw && sCurrency && sCurrency.toLowerCase() !== gCurrencyRaw.toLowerCase()) {
        validationWarnings.push(`Currency Mismatch: Summary claims "${sCurrency}", Granular claims "${gCurrencyRaw}". Human review required.`);
      }

      if (summaryInvoiceCount[invoiceNumber] > 1) {
        validationErrors.push(`Duplicate summary record: Multiple rows with Invoice Number "${invoiceNumber}" found in Invoices Summary.`);
      }

      // Net Line Total discrep checks
      const diffNet = Math.abs(expectedNetLineTotal - netTotal);
      if (diffNet >= 0.01) {
        validationWarnings.push(`Line Calculation Discrepancy: Expected Net Line Total ($${expectedNetLineTotal.toFixed(2)}) disagrees with uploaded Total Amount ($${netTotal.toFixed(2)}) by $${diffNet.toFixed(2)}.`);
      }
    }

    if (validationErrors.length > 0) {
      line.importValidationStatus = "Blocked";
      line.importValidationReason = validationErrors.join(" | ");
    } else if (validationWarnings.length > 0) {
      line.importValidationStatus = "Review Required";
      line.importValidationReason = validationWarnings.join(" | ");
    } else {
      line.importValidationStatus = "Ready for Match";
      line.importValidationReason = "All structural checks passed.";
    }

    builtLines.push(line as InvoiceLine);
  });

  // Header Reconciliation Sum Verification checks
  const groupMap = new Map<string, InvoiceLine[]>();
  builtLines.forEach(l => {
    if (l.invoiceNumber) {
      const arr = groupMap.get(l.invoiceNumber) || [];
      arr.push(l);
      groupMap.set(l.invoiceNumber, arr);
    }
  });

  groupMap.forEach((lines, invNum) => {
    const first = lines[0];
    if (first.importValidationStatus === "Blocked" || !first.originalSummaryRow) return;

    const sRow = first.originalSummaryRow;

    let sSubtotal = 0;
    let sTotalDiscount = 0;
    let sTotalTax = 0;
    let sInvoiceTotal = 0;
    let sAdditionalCharges = 0;

    summaryMappings.forEach(m => {
      const col = m.originalColumn;
      const fKey = m.suggestedField;
      const val = sRow[col];

      if (fKey === "subtotal") sSubtotal = formatCurrencyValue(val);
      else if (fKey === "invoiceLevelDiscount") sTotalDiscount = formatCurrencyValue(val);
      else if (fKey === "invoiceTax") sTotalTax = formatCurrencyValue(val);
      else if (fKey === "invoiceTotal") sInvoiceTotal = formatCurrencyValue(val);
      else if (fKey === "additionalCharges") sAdditionalCharges = formatCurrencyValue(val);
    });

    const sumGross = lines.reduce((sum, l) => sum + (l.grossLineAmount || 0), 0);
    const sumDiscount = lines.reduce((sum, l) => sum + (l.lineDiscount || 0), 0);
    const sumTax = lines.reduce((sum, l) => sum + (l.lineTax || 0), 0);
    const sumNet = lines.reduce((sum, l) => sum + (l.netLineTotal || 0), 0);

    const subtotalDiff = Number((sumGross - sSubtotal).toFixed(2));
    const discountDiff = Number((sumDiscount - sTotalDiscount).toFixed(2));
    const taxDiff = Number((sumTax - sTotalTax).toFixed(2));
    const totalDiff = Number(((sumNet + sAdditionalCharges) - sInvoiceTotal).toFixed(2));

    const failed: string[] = [];
    if (Math.abs(subtotalDiff) >= 0.01) {
      failed.push(`Gross Line Amount sum ($${sumGross.toFixed(2)}) differs from Invoice Subtotal ($${sSubtotal.toFixed(2)}) by $${subtotalDiff.toFixed(2)}.`);
    }
    if (Math.abs(discountDiff) >= 0.01) {
      failed.push(`Line Discount sum ($${sumDiscount.toFixed(2)}) differs from Total Discount ($${sTotalDiscount.toFixed(2)}) by $${discountDiff.toFixed(2)}.`);
    }
    if (Math.abs(taxDiff) >= 0.01) {
      failed.push(`Line Tax sum ($${sumTax.toFixed(2)}) differs from Total Tax ($${sTotalTax.toFixed(2)}) by $${taxDiff.toFixed(2)}.`);
    }
    if (Math.abs(totalDiff) >= 0.01) {
      failed.push(`Net Line Total sum + Additional Charges ($${(sumNet + sAdditionalCharges).toFixed(2)}) differs from Invoice Total ($${sInvoiceTotal.toFixed(2)}) by $${totalDiff.toFixed(2)}.`);
    }

    if (failed.length > 0) {
      lines.forEach(l => {
        if (l.importValidationStatus !== "Blocked") {
          l.importValidationStatus = "Review Required";
          const prev = l.importValidationReason && l.importValidationReason !== "All structural checks passed." ? l.importValidationReason + " | " : "";
          l.importValidationReason = prev + `Reconciliation mismatch: ${failed.join(" ")}`;
        }
      });
    }
  });

  // deterministic duplicate checks within current batch
  // Same-batch duplicate detection is now handled centrally by matchingEngine.ts
  // duplicateStatus field is preserved exclusively for Upstream Extraction Warnings.

  return builtLines;
}
