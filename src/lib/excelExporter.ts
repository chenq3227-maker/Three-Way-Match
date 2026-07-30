import { getFormattedTimestamp } from "../lib/timestamp";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx-js-style";
import { InvoiceLine, POLine, GRNLine } from "../types";
import { parseDDMMYYYY } from "./excelParser";

/**
 * Normalizes text for matching comparisons
 */
function normalizeText(t: any): string {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Finds the matched PO line for an invoice line.
 */
function findMatchedPO(line: InvoiceLine, poLines: POLine[]): POLine | undefined {
  const matchingPOs = poLines.filter(
    (po) => normalizeText(po.poNumber) === normalizeText(line.poNumber)
  );
  if (matchingPOs.length === 0) return undefined;
  
  let matchedPO = matchingPOs.find(
    (po) => String(po.itemDescription).trim() === String(line.itemDescription).trim()
  );
  if (!matchedPO) {
    const isDescriptionMatch = (desc1: string, desc2: string): boolean => {
      const d1 = normalizeText(desc1);
      const d2 = normalizeText(desc2);
      return d1.includes(d2) || d2.includes(d1) || d1.substring(0, 10) === d2.substring(0, 10);
    };
    matchedPO = matchingPOs.find((po) => isDescriptionMatch(po.itemDescription, line.itemDescription));
  }
  return matchedPO;
}

/**
 * Finds the matched GRN lines for an invoice line.
 */
function findMatchedGRNs(line: InvoiceLine, grnLines: GRNLine[]): GRNLine[] {
  const matchingGRNs = grnLines.filter(
    (grn) => normalizeText(grn.poNumber) === normalizeText(line.poNumber)
  );
  if (matchingGRNs.length === 0) return [];
  
  let itemGRNs = matchingGRNs.filter(
    (grn) => String(grn.itemDescription).trim() === String(line.itemDescription).trim()
  );
  if (itemGRNs.length === 0) {
    const isDescriptionMatch = (desc1: string, desc2: string): boolean => {
      const d1 = normalizeText(desc1);
      const d2 = normalizeText(desc2);
      return d1.includes(d2) || d2.includes(d1) || d1.substring(0, 10) === d2.substring(0, 10);
    };
    itemGRNs = matchingGRNs.filter((grn) => isDescriptionMatch(grn.itemDescription, line.itemDescription));
  }
  return itemGRNs;
}

/**
 * Formats a status value with visual high-visibility emoji status indicators.
 */
function formatStatusWithEmoji(status: string | undefined): string {
  if (!status) return "⚪ Unmatched";
  if (status === "On Hold") return "🔴 On Hold";
  if (status === "Review Required") return "🟡 Review Required";
  if (status === "Matched – Awaiting Department Approval") return "🟢 Awaiting Department Approval";
  return status;
}

/**
 * Creates and triggers the download of the redesigned compliant Three-Way Match Excel workbook.
 */
export function exportMatchingResults(
  invoices: InvoiceLine[],
  poLines: POLine[],
  grnLines: GRNLine[]
) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // 1. MATCH RESULTS SHEET
  // ==========================================
  const matchResultsRows: any[][] = [];
  
  // Headers
  matchResultsRows.push([
    "Record ID",
    "Source File",
    "Source Workbook",
    "Supplier Name",
    "Supplier Contact Details",
    "Business Reg / Tax ID",
    "Invoice Number",
    "Invoice Date",
    "Due Date",
    "PO Number",
    "Line Number",
    "Item Description",
    "Quantity Invoiced",
    "Invoice Unit Price",
    "Gross Line Amount",
    "Line Discount",
    "Line Tax",
    "Net Line Total",
    "Invoice Subtotal",
    "Invoice Total",
    "Currency",
    "Payment Terms",
    "Accepted Payment Method",
    "Bank Details",
    "Bank Account / IBAN",
    "Payment Reference",
    "Late Payment Terms",
    "PO Date",
    "PO Supplier Name",
    "PO Item Description",
    "Qty Ordered",
    "PO Unit Price",
    "PO Total Amount",
    "Expected Delivery",
    "GRN Number",
    "GRN Date",
    "GRN Supplier Name",
    "GRN Item Description",
    "Qty Received",
    "GRN Condition",
    "Received By",
    "Supplier Check",
    "Item Check",
    "Quantity Check",
    "Unit Price Check",
    "Line Calculation Check",
    "Invoice Total Check",
    "Duplicate Check",
    "GRN Condition Check",
    "Document Verification Check",
    "Duplicate Candidate ID",
    "Duplicate Candidate Invoice No",
    "Duplicate Check Source",
    "Duplicate Reason",
    "Duplicate Review Decision",
    "Duplicate True Original ID",
    "Invoice-PO Quantity Difference",
    "Invoice-GRN Quantity Difference",
    "Unit Price Difference",
    "Amount Difference",
    "Overall Match Status",
    "Exception Type",
    "Plain-Language Reason",
    "Required Action",
    "Suggested Follow-up Party",
    "Follow-up Status",
    "Original System Result",
    "Review Decision",
    "Reviewed By",
    "Review Notes",
    "Review Timestamp"
  ]);

  // Fill Match Results
  invoices.forEach((line) => {
    const matchedPO = findMatchedPO(line, poLines);
    const itemGRNs = findMatchedGRNs(line, grnLines);

    const totalQtyReceived = itemGRNs.reduce((sum, g) => sum + g.quantityReceived, 0);
    const grnNumbers = itemGRNs.map((g) => g.grnNumber).join(", ") || "";
    const grnDates = itemGRNs.map((g) => g.grnDate).join(", ") || "";
    const grnSuppliers = itemGRNs.map((g) => g.supplier).join(", ") || "";
    const grnDescriptions = itemGRNs.map((g) => g.itemDescription).join(", ") || "";
    const grnConditions = itemGRNs.map((g) => g.condition).join(", ") || "";
    const grnReceivers = itemGRNs.map((g) => g.receivedBy).join(", ") || "";

    const exceptions = line.exceptions || [];

    // Evaluate individual check results
    let supplierCheck = "Not Available";
    let itemCheck = "Not Available";
    let quantityCheck = "Not Available";
    let unitPriceCheck = "Not Available";
    let lineCalculationCheck = "Pass";
    let invoiceTotalCheck = "Pass";
    let duplicateCheck = "Pass";
    let grnConditionCheck = "Not Available";
    let documentVerificationCheck = "Pass";

    if (matchedPO) {
      supplierCheck = exceptions.some(e => e.type === "Supplier Name Mismatch") ? "Fail" : "Pass";
      
      const hasItemMismatch = exceptions.some(e => e.type === "PO Line Item Mismatch" || e.type === "No Delivery Record for Item");
      const hasItemFuzzy = exceptions.some(e => e.type === "Item Description Equivalence");
      itemCheck = hasItemMismatch ? "Fail" : hasItemFuzzy ? "Review Required" : "Pass";

      const hasQtyDiscrepancy = exceptions.some(e => e.type === "Excess Quantity Ordered" || e.type === "Excess Quantity Invoiced");
      quantityCheck = hasQtyDiscrepancy ? (exceptions.find(e => e.type.includes("Quantity"))?.severity === "On Hold" ? "Fail" : "Review Required") : "Pass";

      unitPriceCheck = exceptions.some(e => e.type === "Price Discrepancy") ? "Fail" : "Pass";
    }

    if (exceptions.some(e => e.type === "Mathematical Line-Item Calculation Error")) {
      lineCalculationCheck = "Fail";
    }
    if (exceptions.some(e => e.type === "Invoice Subtotal/Total Discrepancy")) {
      invoiceTotalCheck = "Fail";
    }
    if (exceptions.some(e => e.type === "Batch Duplicate Warning" || e.type === "Invoice Register Duplicate Warning")) {
      duplicateCheck = "Fail";
    }

    if (itemGRNs.length > 0) {
      grnConditionCheck = exceptions.some(e => e.type === "Damaged Goods Condition") ? "Review Required" : "Pass";
    }

    if (exceptions.some(e => e.type === "Unverified Supporting Documents")) {
      documentVerificationCheck = "Review Required";
    }

    // Differences
    const hasPO = !!matchedPO;
    const hasGRN = itemGRNs.length > 0;
    
    const qtyDifferencePO = hasPO ? line.quantityInvoiced - matchedPO.quantityOrdered : "";
    const qtyDifferenceGRN = hasGRN ? line.quantityInvoiced - totalQtyReceived : "";
    
    const unitPriceDifference = hasPO ? line.unitPrice - matchedPO.unitPrice : "";
    const amountDifference = hasPO ? line.lineAmount - (matchedPO.unitPrice * line.quantityInvoiced) : "";

    // Rollup details
    const exceptionTypesStr = line.exceptionType || "";
    const reasonsStr = line.reason || "Matched perfectly.";
    const actionsStr = exceptions.map((e) => e.requiredAction).filter(Boolean).join("; ") || "";
    const partiesStr = line.suggestedFollowupParty || "";
    const followupStatusStr = line.followupStatus || "";

    const originalSystemResult = exceptions.length > 0
      ? (exceptions.some(e => e.severity === "On Hold") ? "On Hold" : "Review Required")
      : "Matched – Awaiting Department Approval";

    matchResultsRows.push([
      line.recordId,
      line.sourceFileName || "",
      line.sourceWorkbookName || "",
      line.supplierName,
      line.supplierContactDetails || "",
      line.businessRegTaxId || "",
      line.invoiceNumber,
      makeExcelCell(line.invoiceDate, "date"),
      makeExcelCell(line.invoiceDueDate, "date"),
      line.poNumber,
      line.lineNumber,
      line.itemDescription,
      makeExcelCell(line.quantityInvoiced, "number"),
      makeExcelCell(line.unitPrice, "currency"),
      makeExcelCell(line.grossLineAmount ?? line.lineAmount, "currency"),
      makeExcelCell(line.lineDiscount ?? 0, "currency"),
      makeExcelCell(line.lineTax ?? line.gst ?? 0, "currency"),
      makeExcelCell(line.netLineTotal ?? line.lineAmount, "currency"),
      makeExcelCell(line.subtotal, "currency"),
      makeExcelCell(line.invoiceTotal, "currency"),
      line.currency,
      line.paymentTerms || "",
      line.acceptedPaymentMethod || "",
      line.bankDetails || "",
      line.bankAccountOrIban || "", // Bank Account / IBAN
      line.paymentReference || "",
      line.latePaymentTerms || "",
      makeExcelCell(matchedPO?.poDate, "date"),
      matchedPO?.supplier || "",
      matchedPO?.itemDescription || "",
      makeExcelCell(matchedPO?.quantityOrdered ?? 0, "number"),
      makeExcelCell(matchedPO?.unitPrice ?? 0, "currency"),
      makeExcelCell(matchedPO?.totalAmount ?? 0, "currency"),
      makeExcelCell(matchedPO?.expectedDelivery, "date"),
      grnNumbers,
      itemGRNs.length > 0 && itemGRNs[0].grnDate ? makeExcelCell(itemGRNs[0].grnDate, "date") : "",
      grnSuppliers,
      grnDescriptions,
      makeExcelCell(totalQtyReceived, "number"),
      grnConditions,
      grnReceivers,
      supplierCheck,
      itemCheck,
      quantityCheck,
      unitPriceCheck,
      lineCalculationCheck,
      invoiceTotalCheck,
      duplicateCheck,
      grnConditionCheck,
      documentVerificationCheck,
      line.duplicateCandidateRecordId || "",
      line.duplicateCandidateInvoiceNumber || "",
      line.duplicateCheckSource || "",
      line.duplicateReason || "",
      line.duplicateReviewDecision || "",
      line.duplicateIdentifiedOriginalId || "",
      qtyDifferencePO !== "" ? makeExcelCell(qtyDifferencePO, "number") : "",
      qtyDifferenceGRN !== "" ? makeExcelCell(qtyDifferenceGRN, "number") : "",
      unitPriceDifference !== "" ? makeExcelCell(unitPriceDifference, "currency") : "",
      amountDifference !== "" ? makeExcelCell(amountDifference, "currency") : "",
      line.overallStatus || "Unmatched",
      exceptionTypesStr,
      reasonsStr,
      actionsStr,
      partiesStr,
      followupStatusStr,
      originalSystemResult,
      line.humanReview?.reviewDecision || "",
      line.humanReview?.reviewerName || "",
      line.humanReview?.notes || "",
      line.humanReview?.timestamp ? makeExcelCell(line.humanReview.timestamp, "date") : ""
    ]);
  });

  const wsMatchResults = buildWorksheet(matchResultsRows);
  XLSX.utils.book_append_sheet(wb, wsMatchResults, "Match Results");


  // ==========================================
  // 2. EXCEPTION LOG SHEET
  // ==========================================
  const exceptionRows: any[][] = [];
  exceptionRows.push([
    "Exception ID",
    "Record ID",
    "Invoice Number",
    "PO Number",
    "GRN Number",
    "Supplier Name",
    "Exception Type",
    "Affected Field",
    "Invoice Value",
    "PO Value",
    "GRN Value",
    "Numerical Difference",
    "Plain-Language Reason",
    "Required Action",
    "Suggested Follow-up Party",
    "Follow-up Status",
    "Original System Result",
    "Review Decision",
    "Reviewed By",
    "Review Notes",
    "Review Timestamp"
  ]);

  invoices
    .filter((line) => line.overallStatus === "Review Required" || line.overallStatus === "On Hold")
    .forEach((line) => {
      const matchedPO = findMatchedPO(line, poLines);
      const itemGRNs = findMatchedGRNs(line, grnLines);
      const totalQtyReceived = itemGRNs.reduce((sum, g) => sum + g.quantityReceived, 0);
      const grnNumbers = itemGRNs.map((g) => g.grnNumber).join(", ") || "";
      const grnConditions = itemGRNs.map((g) => g.condition).join(", ") || "";

      const exceptions = line.exceptions || [];

      const appendExceptionRow = (exc: any, idx: number) => {
        // Map exception type to affected field
        let affectedField = "Line Item";
        let invoiceVal: any = line.lineAmount;
        let poVal: any = matchedPO ? matchedPO.totalAmount : "";
        let grnVal: any = totalQtyReceived || "";

        const type = exc.type || "Discrepancy";
        if (type.includes("Price")) {
          affectedField = "Unit Price";
          invoiceVal = line.unitPrice;
          poVal = matchedPO ? matchedPO.unitPrice : "";
          grnVal = "";
        } else if (type.includes("Quantity Ordered")) {
          affectedField = "Quantity Ordered";
          invoiceVal = line.quantityInvoiced;
          poVal = matchedPO ? matchedPO.quantityOrdered : "";
          grnVal = "";
        } else if (type.includes("Quantity Invoiced")) {
          affectedField = "Quantity Received";
          invoiceVal = line.quantityInvoiced;
          poVal = "";
          grnVal = totalQtyReceived;
        } else if (type.includes("Supplier")) {
          affectedField = "Supplier Name";
          invoiceVal = line.supplierName;
          poVal = matchedPO ? matchedPO.supplier : "";
          grnVal = "";
        } else if (type.includes("GRN") || type.includes("Delivery")) {
          affectedField = "Goods Received Note";
          invoiceVal = "";
          poVal = "";
          grnVal = grnNumbers;
        } else if (type.includes("Damaged") || type.includes("Condition")) {
          affectedField = "Goods Condition";
          invoiceVal = "";
          poVal = "";
          grnVal = grnConditions;
        } else if (type.includes("Duplicate")) {
          affectedField = "Duplicate Status";
          invoiceVal = line.duplicateStatus;
          poVal = "";
          grnVal = "";
        } else if (type.includes("Calculation")) {
          affectedField = "Gross Line Amount";
          invoiceVal = line.lineAmount;
          poVal = "";
          grnVal = "";
        }

        const originalSystemResult = exceptions.some(e => e.severity === "On Hold") ? "🔴 On Hold" : "🟡 Review Required";

        exceptionRows.push([
          `${line.recordId}-EXC-${idx + 1}`,
          line.recordId,
          line.invoiceNumber,
          line.poNumber,
          grnNumbers,
          line.supplierName,
          type,
          affectedField,
          typeof invoiceVal === "number" ? makeExcelCell(invoiceVal, "number") : invoiceVal,
          typeof poVal === "number" ? makeExcelCell(poVal, "number") : poVal,
          typeof grnVal === "number" ? makeExcelCell(grnVal, "number") : grnVal,
          exc.numericalDifference || "",
          exc.reason || line.reason,
          exc.requiredAction || "Resolve discrepancies in system.",
          exc.suggestedFollowupParty || line.suggestedFollowupParty || "Procurement",
          exc.followupStatus || line.followupStatus || "Pending Investigation",
          originalSystemResult,
          line.humanReview?.reviewDecision || "",
          line.humanReview?.reviewerName || "",
          line.humanReview?.notes || "",
          line.humanReview?.timestamp ? makeExcelCell(line.humanReview.timestamp, "date") : ""
        ]);
      };

      if (exceptions.length > 0) {
        exceptions.forEach((exc, idx) => {
          appendExceptionRow(exc, idx);
        });
      } else {
        // Fallback row for line-level properties if exceptions array is empty
        appendExceptionRow({
          type: line.exceptionType || "Review Required",
          reason: line.reason || "Requires human review.",
          suggestedFollowupParty: line.suggestedFollowupParty,
          followupStatus: line.followupStatus,
          numericalDifference: "",
          requiredAction: "Verify invoice and PO matching."
        }, 0);
      }
    });

  const wsExceptions = buildWorksheet(exceptionRows);
  XLSX.utils.book_append_sheet(wb, wsExceptions, "Exception Log");


  // ==========================================
  // 3. INPUT & EXTRACTION LOG SHEET
  // ==========================================
  const mappingRows: any[][] = [];
  mappingRows.push([
    "Document Category",
    "Source File",
    "Source Workbook",
    "Document Number",
    "Field Name",
    "Original Extracted Value",
    "Standardised Value",
    "Human-Confirmed Value",
    "Mapping Method",
    "Extraction Status",
    "Used in Current Match",
    "Related Record ID",
    "Confirmed By",
    "Confirmation Timestamp"
  ]);

  // A. Invoices
  invoices.forEach((line) => {
    const fieldsToLog: Array<{ name: string; raw: any; std: any; conf: any; status: string; isDate?: boolean; isNum?: boolean; isCurr?: boolean }> = [
      { name: "Supplier Name", raw: line.originalData?.supplierName || line.supplierName, std: line.supplierName, conf: line.supplierName, status: line.extractionStatus || "clear" },
      { name: "Invoice Number", raw: line.originalData?.invoiceNumber || line.invoiceNumber, std: line.invoiceNumber, conf: line.invoiceNumber, status: line.extractionStatus || "clear" },
      { name: "Invoice Date", raw: line.originalData?.invoiceDate || line.invoiceDate, std: line.invoiceDate, conf: line.invoiceDate, status: line.extractionStatus || "clear", isDate: true },
      { name: "Due Date", raw: line.originalData?.invoiceDueDate || line.invoiceDueDate, std: line.invoiceDueDate, conf: line.invoiceDueDate, status: line.extractionStatus || "clear", isDate: true },
      { name: "Quantity Invoiced", raw: line.originalData?.quantityInvoiced || line.quantityInvoiced, std: line.quantityInvoiced, conf: line.quantityInvoiced, status: line.extractionStatus || "clear", isNum: true },
      { name: "Unit Price", raw: line.originalData?.unitPrice || line.unitPrice, std: line.unitPrice, conf: line.unitPrice, status: line.extractionStatus || "clear", isCurr: true },
      { name: "Line Amount", raw: line.originalData?.lineAmount || line.lineAmount, std: line.lineAmount, conf: line.lineAmount, status: line.extractionStatus || "clear", isCurr: true },
      { name: "Invoice Total", raw: line.originalData?.invoiceTotal || line.invoiceTotal, std: line.invoiceTotal, conf: line.invoiceTotal, status: line.extractionStatus || "clear", isCurr: true },
      { name: "Bank Details", raw: line.bankDetails, std: line.bankDetails, conf: line.bankDetails, status: line.extractionStatus || "clear" },
      { name: "Bank Account / IBAN", raw: line.bankAccountOrIban, std: line.bankAccountOrIban, conf: line.bankAccountOrIban, status: line.extractionStatus || "clear" },
      { name: "Payment Reference", raw: line.paymentReference, std: line.paymentReference, conf: line.paymentReference, status: line.extractionStatus || "clear" },
      { name: "Late Payment Terms", raw: line.latePaymentTerms, std: line.latePaymentTerms, conf: line.latePaymentTerms, status: line.extractionStatus || "clear" },
      { name: "Source File Name", raw: line.sourceFileName, std: line.sourceFileName, conf: line.sourceFileName, status: line.extractionStatus || "clear" }
    ];

    fieldsToLog.forEach((f) => {
      let rawVal = f.raw;
      let stdVal = f.std;
      let confVal = f.conf;

      if (f.isDate) {
        rawVal = makeExcelCell(String(f.raw), "date");
        stdVal = makeExcelCell(String(f.std), "date");
        confVal = makeExcelCell(String(f.conf), "date");
      } else if (f.isNum) {
        rawVal = makeExcelCell(f.raw, "number");
        stdVal = makeExcelCell(f.std, "number");
        confVal = makeExcelCell(f.conf, "number");
      } else if (f.isCurr) {
        rawVal = makeExcelCell(f.raw, "currency");
        stdVal = makeExcelCell(f.std, "currency");
        confVal = makeExcelCell(f.conf, "currency");
      }

      const isConfirmed = !!line.confirmedByHuman;
      const verifiedBy = isConfirmed ? (line.humanReview?.reviewerName || "App 1 User") : "";
      const verificationTime = isConfirmed ? (line.humanReview?.timestamp ? makeExcelCell(line.humanReview.timestamp, "date") : makeExcelCell(getFormattedTimestamp(), "date")) : "";

      mappingRows.push([
        "Invoice",
        line.sourceFileName || "",
        line.sourceWorkbookName || "",
        line.invoiceNumber,
        f.name,
        rawVal,
        stdVal,
        isConfirmed ? confVal : "", // Human-Confirmed Value
        line.worksheetOrigin || "Excel Upload",
        f.status,
        "Yes", // Always used in current matching batch
        line.recordId,
        verifiedBy,
        verificationTime
      ]);
    });
  });

  // B. PO Lines
  poLines.forEach((po) => {
    const isUsed = invoices.some(inv => normalizeText(inv.poNumber) === normalizeText(po.poNumber)) ? "Yes" : "No";

    const fieldsToLog: Array<{ name: string; raw: any; std: any; conf: any; status: string; isDate?: boolean; isNum?: boolean; isCurr?: boolean }> = [
      { name: "Supplier Name", raw: po.originalValues?.supplier || po.supplier, std: po.supplier, conf: po.supplier, status: po.extractionQuality?.supplier || "clear" },
      { name: "PO Date", raw: po.originalValues?.poDate || po.poDate, std: po.poDate, conf: po.poDate, status: po.extractionQuality?.poDate || "clear", isDate: true },
      { name: "Item Description", raw: po.originalValues?.itemDescription || po.itemDescription, std: po.itemDescription, conf: po.itemDescription, status: po.extractionQuality?.itemDescription || "clear" },
      { name: "Quantity Ordered", raw: po.originalValues?.quantityOrdered || po.quantityOrdered, std: po.quantityOrdered, conf: po.quantityOrdered, status: po.extractionQuality?.quantityOrdered || "clear", isNum: true },
      { name: "Unit Price", raw: po.originalValues?.unitPrice || po.unitPrice, std: po.unitPrice, conf: po.unitPrice, status: po.extractionQuality?.unitPrice || "clear", isCurr: true },
      { name: "Total Amount", raw: po.originalValues?.totalAmount || po.totalAmount, std: po.totalAmount, conf: po.totalAmount, status: po.extractionQuality?.totalAmount || "clear", isCurr: true },
      { name: "Expected Delivery Date", raw: po.originalValues?.expectedDelivery || po.expectedDelivery, std: po.expectedDelivery, conf: po.expectedDelivery, status: po.extractionQuality?.expectedDelivery || "clear", isDate: true }
    ];

    fieldsToLog.forEach((f) => {
      let rawVal = f.raw;
      let stdVal = f.std;
      let confVal = f.conf;

      if (f.isDate) {
        rawVal = makeExcelCell(String(f.raw), "date");
        stdVal = makeExcelCell(String(f.std), "date");
        confVal = makeExcelCell(String(f.conf), "date");
      } else if (f.isNum) {
        rawVal = makeExcelCell(f.raw, "number");
        stdVal = makeExcelCell(f.std, "number");
        confVal = makeExcelCell(f.conf, "number");
      } else if (f.isCurr) {
        rawVal = makeExcelCell(f.raw, "currency");
        stdVal = makeExcelCell(f.std, "currency");
        confVal = makeExcelCell(f.conf, "currency");
      }

      const isConfirmed = !!po.verifiedRecord;
      const verifiedBy = isConfirmed ? po.verifiedRecord.reviewerName : "";
      const verificationTime = isConfirmed && po.verifiedRecord?.verifiedAt ? makeExcelCell(po.verifiedRecord.verifiedAt, "date") : "";

      mappingRows.push([
        "Purchase Order",
        po.sourceFileName,
        po.sourceWorkbookName || po.sourceFileName || "Scanned PO",
        po.poNumber,
        f.name,
        rawVal,
        stdVal,
        isConfirmed ? confVal : "",
        po.sourceType === "extracted" ? "AI Extraction" : "Excel Upload",
        f.status,
        isUsed,
        po.id,
        verifiedBy,
        verificationTime
      ]);
    });
  });

  // C. GRN Lines
  grnLines.forEach((grn) => {
    const isUsed = invoices.some(inv => normalizeText(inv.poNumber) === normalizeText(grn.poNumber)) ? "Yes" : "No";

    const fieldsToLog: Array<{ name: string; raw: any; std: any; conf: any; status: string; isDate?: boolean; isNum?: boolean; isCurr?: boolean }> = [
      { name: "Supplier Name", raw: grn.originalValues?.supplier || grn.supplier, std: grn.supplier, conf: grn.supplier, status: grn.extractionQuality?.supplier || "clear" },
      { name: "GRN Date", raw: grn.originalValues?.grnDate || grn.grnDate, std: grn.grnDate, conf: grn.grnDate, status: grn.extractionQuality?.grnDate || "clear", isDate: true },
      { name: "Item Description", raw: grn.originalValues?.itemDescription || grn.itemDescription, std: grn.itemDescription, conf: grn.itemDescription, status: grn.extractionQuality?.itemDescription || "clear" },
      { name: "Quantity Received", raw: grn.originalValues?.quantityReceived || grn.quantityReceived, std: grn.quantityReceived, conf: grn.quantityReceived, status: grn.extractionQuality?.quantityReceived || "clear", isNum: true },
      { name: "Delivery Condition", raw: grn.originalValues?.condition || grn.condition, std: grn.condition, conf: grn.condition, status: grn.extractionQuality?.condition || "clear" },
      { name: "Received By Signature", raw: grn.originalValues?.receivedBy || grn.receivedBy, std: grn.receivedBy, conf: grn.receivedBy, status: grn.extractionQuality?.receivedBy || "clear" }
    ];

    fieldsToLog.forEach((f) => {
      let rawVal = f.raw;
      let stdVal = f.std;
      let confVal = f.conf;

      if (f.isDate) {
        rawVal = makeExcelCell(String(f.raw), "date");
        stdVal = makeExcelCell(String(f.std), "date");
        confVal = makeExcelCell(String(f.conf), "date");
      } else if (f.isNum) {
        rawVal = makeExcelCell(f.raw, "number");
        stdVal = makeExcelCell(f.std, "number");
        confVal = makeExcelCell(f.conf, "number");
      } else if (f.isCurr) {
        rawVal = makeExcelCell(f.raw, "currency");
        stdVal = makeExcelCell(f.std, "currency");
        confVal = makeExcelCell(f.conf, "currency");
      }

      const isConfirmed = !!grn.verifiedRecord;
      const verifiedBy = isConfirmed ? grn.verifiedRecord.reviewerName : "";
      const verificationTime = isConfirmed && grn.verifiedRecord?.verifiedAt ? makeExcelCell(grn.verifiedRecord.verifiedAt, "date") : "";

      mappingRows.push([
        "Goods Received Note",
        grn.sourceFileName,
        grn.sourceWorkbookName || grn.sourceFileName || "Scanned GRN",
        grn.grnNumber,
        f.name,
        rawVal,
        stdVal,
        isConfirmed ? confVal : "",
        grn.sourceType === "extracted" ? "AI Extraction" : "Excel Upload",
        f.status,
        isUsed,
        grn.id,
        verifiedBy,
        verificationTime
      ]);
    });
  });

  const wsMappingLog = buildWorksheet(mappingRows);
  XLSX.utils.book_append_sheet(wb, wsMappingLog, "Input & Extraction Log");


  // ==========================================
  // 4. APP 3 HANDOFF SHEET
  // ==========================================
  const handoffRows: any[][] = [];
  handoffRows.push([
    "Handoff Record ID",
    "Invoice Number",
    "Supplier Name",
    "Supplier Contact Details",
    "Business Reg / Tax ID",
    "Invoice Date",
    "Due Date",
    "PO Number(s)",
    "GRN Number(s)",
    "Invoice Total",
    "Currency",
    "Payment Terms",
    "Accepted Payment Method",
    "Bank Details",
    "Bank Account / IBAN",
    "Payment Reference",
    "Late Payment Terms",
    "Source File",
    "Source Workbook",
    "Overall Match Status",
    "Exception Summary",
    "Department Approval Status",
    "Department Approved By",
    "Department Approval Date",
    "App 3 Intake Status",
    "Payment Eligibility",
    "Blocking Reason",
    "Suggested Next Action",
    "Bank Details Verification Status",
    "Madam Lim Authorisation Status",
    "Reminder Status",
    "Payment Status",
    "Last Updated"
  ]);

  // Group invoices by invoiceNumber and supplierName to have 1 row per invoice
  const invoicesGrouped: Record<string, InvoiceLine[]> = {};
  invoices.forEach((line) => {
    const key = `${line.invoiceNumber}-${line.supplierName}`;
    if (!invoicesGrouped[key]) {
      invoicesGrouped[key] = [];
    }
    invoicesGrouped[key].push(line);
  });

  Object.keys(invoicesGrouped).forEach((key) => {
    const invoiceLines = invoicesGrouped[key];
    const refLine = invoiceLines[0];

    // Combine POs
    const poSet = new Set<string>();
    invoiceLines.forEach(l => { if (l.poNumber) poSet.add(l.poNumber); });
    const poNumbersStr = Array.from(poSet).join(", ") || "";

    // Combine GRNs
    const grnSet = new Set<string>();
    invoiceLines.forEach(l => {
      const itemGRNs = findMatchedGRNs(l, grnLines);
      itemGRNs.forEach(g => { if (g.grnNumber) grnSet.add(g.grnNumber); });
    });
    const grnNumbersStr = Array.from(grnSet).join(", ") || "";

    // Overall Rolled-up Status (Most severe line status takes precedence)
    const lineStatuses = invoiceLines.map(l => l.overallStatus);
    let rolledStatus: "On Hold" | "Review Required" | "Matched – Awaiting Department Approval" = "Matched – Awaiting Department Approval";
    
    if (lineStatuses.some(s => s === "On Hold")) {
      rolledStatus = "On Hold";
    } else if (lineStatuses.some(s => s === "Review Required")) {
      rolledStatus = "Review Required";
    } else if (lineStatuses.some(s => s === "Matched – Awaiting Department Approval")) {
      rolledStatus = "Matched – Awaiting Department Approval";
    }

    // Exception Summary
    const excTypesSet = new Set<string>();
    invoiceLines.forEach(l => {
      if (l.exceptionType && l.exceptionType !== "None") {
        excTypesSet.add(l.exceptionType);
      }
      if (l.exceptions) {
        l.exceptions.forEach(e => excTypesSet.add(e.type));
      }
    });
    const exceptionSummary = Array.from(excTypesSet).join("; ") || "";

    // Accepted Payment Method resolution
    const paymentMethodsSet = new Set<string>();
    invoiceLines.forEach(l => {
      const pm = (l.acceptedPaymentMethod || "").trim();
      if (pm) {
        paymentMethodsSet.add(pm);
      }
    });

    let finalPaymentMethod = "Not Provided";
    if (paymentMethodsSet.size === 1) {
      finalPaymentMethod = Array.from(paymentMethodsSet)[0];
    } else if (paymentMethodsSet.size > 1) {
      finalPaymentMethod = "Confirmation Required";
    }

    // Map App 3 Handoff Status Rules
    let app3IntakeStatus = "";
    let departmentApprovalStatus = "";
    let paymentEligibility = "";
    let blockingReason = "";
    let madamLimAuthorisationStatus = "";
    let reminderStatus = "";
    let paymentStatus = "";
    let suggestedNextAction = "";

    if (rolledStatus === "Matched – Awaiting Department Approval" ) {
      app3IntakeStatus = "Ready for Department Approval";
      departmentApprovalStatus = "Pending";
      paymentEligibility = "No – Department Approval Pending";
      madamLimAuthorisationStatus = "Not Requested";
      reminderStatus = "Not Started";
      paymentStatus = "Not Scheduled";
      suggestedNextAction = "Route invoice details to department head for approval.";
      blockingReason = "";
    } else if (rolledStatus === "Review Required") {
      app3IntakeStatus = "Blocked – Review Required";
      departmentApprovalStatus = "Blocked";
      paymentEligibility = "No – Exception Unresolved";
      madamLimAuthorisationStatus = "Not Requested";
      reminderStatus = "Not Started";
      paymentStatus = "Blocked";
      suggestedNextAction = "Complete discrepancy investigation in reconciliation dashboard.";
      blockingReason = "Review Required exceptions pending human resolution: " + exceptionSummary;
    } else if (rolledStatus === "On Hold") {
      app3IntakeStatus = "Blocked – On Hold";
      departmentApprovalStatus = "Blocked";
      paymentEligibility = "No – On Hold";
      madamLimAuthorisationStatus = "Not Requested";
      reminderStatus = "Not Started";
      paymentStatus = "Blocked";
      suggestedNextAction = "Coordinate with procurement and supplier to resolve hold exception.";
      blockingReason = "On Hold exception flagged: " + exceptionSummary;
    }

    // Bank Details Verification Status
    const isBankVerified = invoiceLines.some(l => l.confirmedByHuman);
    const bankDetailsVerificationStatus = isBankVerified ? "Verified by Human" : "Not Verified";

    handoffRows.push([
      `HO-REC-${refLine.invoiceNumber}`,
      refLine.invoiceNumber,
      refLine.supplierName,
      refLine.supplierContactDetails || "",
      refLine.businessRegTaxId || "",
      makeExcelCell(refLine.invoiceDate, "date"),
      makeExcelCell(refLine.invoiceDueDate, "date"),
      poNumbersStr,
      grnNumbersStr,
      makeExcelCell(refLine.invoiceTotal, "currency"), // Only once!
      refLine.currency,
      refLine.paymentTerms || "",
      finalPaymentMethod,
      refLine.bankDetails || "",
      refLine.bankAccountOrIban || "", // Bank Account / IBAN
      refLine.paymentReference || "",
      refLine.latePaymentTerms || "",
      refLine.sourceFileName || "",
      refLine.sourceWorkbookName || "",
      rolledStatus,
      exceptionSummary,
      departmentApprovalStatus,
      "", // Department Approved By (must never infer)
      "", // Department Approval Date (must never infer)
      app3IntakeStatus,
      paymentEligibility,
      blockingReason,
      suggestedNextAction,
      bankDetailsVerificationStatus,
      madamLimAuthorisationStatus,
      reminderStatus,
      paymentStatus,
      makeExcelCell(getFormattedTimestamp(), "date")
    ]);
  });

  const wsHandoff = buildWorksheet(handoffRows);
  XLSX.utils.book_append_sheet(wb, wsHandoff, "App 3 Handoff");


  // ==========================================
  // WRITE AND DOWNLOAD WORKBOOK
  // ==========================================
  XLSX.writeFile(wb, `AP-Three-Way-Match-Audit-Trail-${getFormattedTimestamp().slice(0, 10)}.xlsx`);
}

/**
 * Builds a worksheet manually to handle formatted cells (numbers, dates, currency) properly,
 * applying freeze views, autofilters, dynamic column widths, and line row heights.
 */
function buildWorksheet(data: any[][]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };

  if (data.length > 0) {
    const expectedCols = data[0].length;
    for (let i = 1; i < data.length; i++) {
      if (data[i].length !== expectedCols) {
        throw new Error(`Export Validation Error: Row ${i} has ${data[i].length} columns, but the header has ${expectedCols} columns. This prevents field shifting.`);
      }
    }
  }

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (range.s.r > r) range.s.r = r;
      if (range.s.c > c) range.s.c = c;
      if (range.e.r < r) range.e.r = r;
      if (range.e.c < c) range.e.c = c;

      const cellVal = data[r][c];
      const cellRef = XLSX.utils.encode_cell({ r, c });
      
      // header formatting for row 0
      if (r === 0) {
         if (cellVal) {
           ws[cellRef] = { t: "s", v: String(cellVal), s: { font: { bold: true } } };
         }
         continue;
      }

      if (cellVal === null || cellVal === undefined) {
        continue;
      }

      // Check if it's a special formatted cell structure
      if (typeof cellVal === "object" && cellVal.__isFormattedCell) {
        ws[cellRef] = cellVal.cell;
        
        // Add styling for Matched/Review/On Hold if it's the specific status text
        if (cellVal.cell && typeof cellVal.cell.v === "string") {
            const v = cellVal.cell.v;
            if (v === "🟢 Matched – Awaiting Department Approval" || v === "Matched – Awaiting Department Approval") {
                cellVal.cell.s = { fill: { patternType: "solid", fgColor: { rgb: "FFD4EDDA" } }, font: { color: { rgb: "FF155724" } } };
            } else if (v === "🟡 Review Required" || v === "Review Required") {
                cellVal.cell.s = { fill: { patternType: "solid", fgColor: { rgb: "FFFFF3CD" } }, font: { color: { rgb: "FF856404" } } };
            } else if (v === "🔴 On Hold" || v === "On Hold") {
                cellVal.cell.s = { fill: { patternType: "solid", fgColor: { rgb: "FFF8D7DA" } }, font: { color: { rgb: "FF721C24" } } };
            }
        }
      } else {
        // Standard cell mapping
        if (typeof cellVal === "number") {
          ws[cellRef] = { t: "n", v: cellVal };
        } else if (typeof cellVal === "boolean") {
          ws[cellRef] = { t: "b", v: cellVal };
        } else {
          ws[cellRef] = { t: "s", v: String(cellVal) };
          const strVal = String(cellVal);
          if (strVal === "🟢 Matched – Awaiting Department Approval" || strVal === "Matched – Awaiting Department Approval") {
              ws[cellRef].s = { fill: { patternType: "solid", fgColor: { rgb: "FFD4EDDA" } }, font: { color: { rgb: "FF155724" } } };
          } else if (strVal === "🟡 Review Required" || strVal === "Review Required") {
              ws[cellRef].s = { fill: { patternType: "solid", fgColor: { rgb: "FFFFF3CD" } }, font: { color: { rgb: "FF856404" } } };
          } else if (strVal === "🔴 On Hold" || strVal === "On Hold") {
              ws[cellRef].s = { fill: { patternType: "solid", fgColor: { rgb: "FFF8D7DA" } }, font: { color: { rgb: "FF721C24" } } };
          }
        }
      }
    }
  }

  if (range.s.c < 10000000) {
    ws["!ref"] = XLSX.utils.encode_range(range);

    // 1. Dynamic Columns calculation
    const cols: XLSX.ColInfo[] = [];
    for (let c = 0; c <= range.e.c; c++) {
      let maxLength = 12; // Minimum column width
      for (let r = 0; r <= range.e.r; r++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const valStr = String(cell.v);
          if (valStr.length > maxLength) {
            maxLength = valStr.length;
          }
        }
      }
      // Add padding and cap column widths to prevent excessive sizes, while ensuring readability
      cols.push({ wch: Math.min(maxLength + 3, 40) });
    }
    ws["!cols"] = cols;

    // 2. Set Row Heights (Header taller than content)
    const rows: XLSX.RowInfo[] = [];
    rows.push({ hpt: 28 }); // Header row height
    for (let r = 1; r <= range.e.r; r++) {
      rows.push({ hpt: 20 }); // Data rows
    }
    ws["!rows"] = rows;

    // 3. Freeze Header Row (Row 1)
    ws["!views"] = [
      { state: "frozen", ySplit: 1, xSplit: 0, activePane: "bottomLeft", paneType: "frozen" }
    ];

    // 4. Enable Excel Filters on entire dataset
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: range.e.c, r: range.e.r } })
    };
  }

  return ws;
}

/**
 * Helper to produce formatted cell structures for SheetJS.
 * Business dates are formatted as literal s (string) cells to prevent fractional serial conversions.
 */
function makeExcelCell(value: any, type: "currency" | "number" | "date"): any {
  if (
    value === undefined || 
    value === null || 
    value === "" ||
    (typeof value === "string" && ["n/a", "none", "missing", "missing po"].includes(value.toLowerCase().trim()))
  ) {
    return { __isFormattedCell: true, cell: { t: "s", v: "" } };
  }

  if (type === "currency") {
    const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9\.\-]/g, ""));
    return {
      __isFormattedCell: true,
      cell: isNaN(num) ? { t: "s", v: "" } : { t: "n", v: num, z: "$#,##0.00" }
    };
  }

  if (type === "number") {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return {
      __isFormattedCell: true,
      cell: isNaN(num) ? { t: "s", v: "" } : { t: "n", v: num, z: "#,##0.00" }
    };
  }

  if (type === "date") {
    // Parse the date and export as a true Excel date
    let parsedDate = new Date(value);
    
    // If value is just YYYY-MM-DD, parsing it directly as YYYY-MM-DD creates a UTC midnight date, 
    // which in some local timezones might shift to the previous day when formatted by SheetJS.
    // Instead, parse parts to local time if it matches YYYY-MM-DD exactly.
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
       const [y, m, d] = value.split("-").map(Number);
       parsedDate = new Date(y, m - 1, d, 0, 0, 0);
    } else if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
       // if it happens to be DD/MM/YYYY
       const [d, m, y] = value.split("/").map(Number);
       parsedDate = new Date(y, m - 1, d, 0, 0, 0);
    }
    
    if (isNaN(parsedDate.getTime())) {
      // Fallback to text if parsing fails
      return {
        __isFormattedCell: true,
        cell: { t: "s", v: String(value) }
      };
    }
    
    const isTimestamp = typeof value === "string" && (value.includes(":") || value.toLowerCase().includes("m"));
    
    return {
      __isFormattedCell: true,
      cell: { 
        t: "d", 
        v: parsedDate, 
        z: "dd/mm/yyyy" 
      }
    };
  }

  return value;
}
