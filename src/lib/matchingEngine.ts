/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvoiceLine, POLine, GRNLine, ColumnMapping } from "../types";

/**
 * Checks if a value is blank, N/A, Not Available or other forms of missing information.
 */
export function isMissingValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return s === "" || s === "n/a" || s === "not available" || s === "not provided" || s === "blank" || s === "not_provided" || s === "notprovided" || s === "notavailable" || s === "none";
}

/**
 * Strips punctuation, whitespace, and lowercases text for comparisons.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // remove punctuation
    .trim();
}

/**
 * Checks if two descriptions are highly likely similar.
 */
export function isDescriptionMatch(desc1: string, desc2: string): boolean {
  const norm1 = normalizeText(desc1);
  const norm2 = normalizeText(desc2);
  if (!norm1 || !norm2) return false;
  return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
}

/**
 * Format helper for consistently displaying currency with thousands commas and 2 decimals.
 */
const formatMoney = (val: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

/**
 * Executes the three-way matching algorithm on the uploaded data.
 */
export function runThreeWayMatch(
  invoices: InvoiceLine[],
  poLines: POLine[],
  grnLines: GRNLine[],
  summaryMappings?: ColumnMapping[],
  granularMappings?: ColumnMapping[],
  historicalInvoices: InvoiceLine[] = []
): InvoiceLine[] {
  // Step 1: Pre-check duplicate pairs inside the current batch
  const invoiceMap = new Map<string, InvoiceLine[]>();
  invoices.forEach((inv) => {
    const list = invoiceMap.get(inv.invoiceNumber) || [];
    list.push(inv);
    invoiceMap.set(inv.invoiceNumber, list);
  });

  // Find duplicates by comparing: supplier, PO number, date, item, quantity, unit price, total
  // and flag them if the invoice numbers differ.
  const duplicatePairs = new Set<string>();
  let nextGroupId = 1;
  const duplicateGroupIds = new Map<string, string>(); // recordId -> groupId
  const duplicateCandidates = new Map<string, any>(); // recordId -> candidate info
  const historicalDuplicates = new Set<string>(); // recordId -> true
  
  for (let i = 0; i < invoices.length; i++) {
    // Check against historical first
    const a = invoices[i];
    for (const h of historicalInvoices) {
      const sameInvoiceNumber = a.invoiceNumber === h.invoiceNumber;
      if (sameInvoiceNumber) {
        historicalDuplicates.add(a.recordId);
        duplicateCandidates.set(a.recordId, h);
        break; // found one
      }
    }

    // Now internal checking
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i];
      const b = invoices[j];
      
      const sameInvoiceNumber = a.invoiceNumber === b.invoiceNumber;
      
      const sameSupplier = normalizeText(a.supplierName) === normalizeText(b.supplierName);
      const samePO = normalizeText(a.poNumber) === normalizeText(b.poNumber);
      const sameDate = a.invoiceDate === b.invoiceDate;
      const sameItem = normalizeText(a.itemDescription) === normalizeText(b.itemDescription);
      const sameQty = a.quantityInvoiced === b.quantityInvoiced;
      const samePrice = Math.abs(a.unitPrice - b.unitPrice) < 0.001;
      const sameTotal = Math.abs(a.invoiceTotal - b.invoiceTotal) < 0.001;

      // Group as same batch if they have the exact same item/qty/price details OR they share the same invoice number and supplier
      if ((sameSupplier && samePO && sameDate && sameItem && sameQty && samePrice && sameTotal) || (sameInvoiceNumber && sameSupplier)) {
          duplicatePairs.add(a.recordId);
          duplicatePairs.add(b.recordId);

          let groupId = duplicateGroupIds.get(a.recordId) || duplicateGroupIds.get(b.recordId);
          if (!groupId) {
            groupId = `GRP-${nextGroupId++}`;
          }
          duplicateGroupIds.set(a.recordId, groupId);
          duplicateGroupIds.set(b.recordId, groupId);
          
          if (!duplicateCandidates.has(a.recordId)) duplicateCandidates.set(a.recordId, b);
          if (!duplicateCandidates.has(b.recordId)) duplicateCandidates.set(b.recordId, a);
        }
    }
  }

  // Step 2: Match line by line and accumulate exceptions
  const matchedLines = invoices.map((invoice): InvoiceLine => {
    const updatedLine = { ...invoice };
    
    // Calculate expected line amount (quantity * unitPrice) to verify mathematical accuracy
    const expectedLineAmount = Number((updatedLine.quantityInvoiced * updatedLine.unitPrice).toFixed(2));
    updatedLine.calculatedLineAmount = expectedLineAmount;

    const lineAmt = updatedLine.lineAmount !== undefined && updatedLine.lineAmount !== 0
      ? updatedLine.lineAmount 
      : expectedLineAmount;

    // Mathematical correctness check
    const calculationError = Math.abs(lineAmt - expectedLineAmount) >= 0.01;

    // Check duplicate statuses
    const hasExternalDuplicateWarning = 
      updatedLine.duplicateStatus === "Possible Duplicate" || 
      updatedLine.duplicateStatus === "Exact Duplicate";
      
    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);
    const isHistoricalDuplicate = historicalDuplicates.has(updatedLine.recordId);
    
    if (isHistoricalDuplicate && !isInternalDuplicate) {
      updatedLine.duplicateCheckSource = "Historical Duplicate";
      const cand = duplicateCandidates.get(updatedLine.recordId);
      if (cand) {
        updatedLine.duplicateCandidateRecordId = cand.recordId;
        updatedLine.duplicateCandidateInvoiceNumber = cand.invoiceNumber;
        updatedLine.duplicateCandidateSourceFile = cand.sourceFileName || "Historical Register";
      }
      updatedLine.duplicateReason = "Invoice number matches a record in the historical register.";
    } else if (isInternalDuplicate) {
      updatedLine.duplicateGroupId = duplicateGroupIds.get(updatedLine.recordId);
      updatedLine.duplicateCheckSource = "Same-Batch Duplicate";
      const cand = duplicateCandidates.get(updatedLine.recordId);
      if (cand) {
        updatedLine.duplicateCandidateRecordId = cand.recordId;
        updatedLine.duplicateCandidateInvoiceNumber = cand.invoiceNumber;
        updatedLine.duplicateCandidateSourceFile = cand.sourceFileName;
      }
      updatedLine.duplicateReason = "Supplier, PO, date, item, quantity, and amount match another invoice in the batch.";
    } else if (hasExternalDuplicateWarning) {
      updatedLine.duplicateCheckSource = "Upstream Duplicate Warning";
      updatedLine.duplicateReason = "Flagged by invoice extraction system.";
      
      if (!updatedLine.duplicateOf) {
        updatedLine.duplicateReason = "Duplicate reference missing—this invoice was flagged by the invoice-extraction stage, but the suspected comparison record was not provided.";
      } else {
        // Find if the duplicateOf is in the batch
        const cand = invoices.find(inv => inv.invoiceNumber === updatedLine.duplicateOf && inv.recordId !== updatedLine.recordId);
        if (cand) {
           let groupId = duplicateGroupIds.get(cand.recordId) || duplicateGroupIds.get(updatedLine.recordId);
           if (!groupId) {
             groupId = `GRP-${nextGroupId++}`;
           }
           updatedLine.duplicateGroupId = groupId;
           updatedLine.duplicateCandidateRecordId = cand.recordId;
           updatedLine.duplicateCandidateInvoiceNumber = cand.invoiceNumber;
           updatedLine.duplicateCandidateSourceFile = cand.sourceFileName;
           duplicateGroupIds.set(cand.recordId, groupId);
           duplicateGroupIds.set(updatedLine.recordId, groupId);
        } else {
           const histCand = historicalInvoices.find(inv => inv.invoiceNumber === updatedLine.duplicateOf);
           if (histCand) {
             updatedLine.duplicateCheckSource = "Historical Duplicate";
             updatedLine.duplicateCandidateRecordId = histCand.recordId;
             updatedLine.duplicateCandidateInvoiceNumber = histCand.invoiceNumber;
             updatedLine.duplicateCandidateSourceFile = histCand.sourceFileName;
           } else {
             updatedLine.duplicateCheckSource = "Historical Duplicate";
             updatedLine.duplicateCandidateInvoiceNumber = updatedLine.duplicateOf;
             if (historicalInvoices.length === 0) {
               updatedLine.duplicateReason = "Historical duplicate checking was not performed (no historical data uploaded). Reference provided: " + updatedLine.duplicateOf;
             } else {
               updatedLine.duplicateReason = "Could not locate historical record for reference " + updatedLine.duplicateOf;
             }
           }
        }
      }
    }

    // Unresolved extraction checks
    const estatus = normalizeText(updatedLine.extractionStatus || "");
    const isStatusReviewRequired = 
      estatus === "reviewrequired" || 
      (estatus !== "" &&
       estatus !== "readyformatch" && 
       estatus !== "clear" && 
       estatus !== "success" && 
       estatus !== "ok");

    const fReview = (updatedLine.fieldsRequiringReview || "").trim().toLowerCase();
    const isFieldUnresolved = fReview !== "" && fReview !== "n/a";
    const hasExtractionIssues = isStatusReviewRequired || isFieldUnresolved;

    // Lookup supporting PO documents
    const matchingPOs = poLines.filter(
      (po) => normalizeText(po.poNumber) === normalizeText(updatedLine.poNumber)
    );

    // List to gather all exceptions for this line
    const exceptions: Array<{
      type: string;
      severity: "On Hold" | "Review Required";
      reason: string;
      suggestedFollowupParty: string;
      followupStatus: string;
      numericalDifference?: string;
      requiredAction?: string;
    }> = [];

    // ----------------------------------------------------------------------
    // Optional Mappings Verification Checks
    // ----------------------------------------------------------------------
    const optionalMappings = [
      ...(summaryMappings || []),
      ...(granularMappings || [])
    ].filter(m => 
      m.suggestedField && 
      !["invoiceNumber", "poNumber", "supplierName", "itemDescription", "quantityInvoiced", "unitPrice"].includes(m.suggestedField) &&
      (m.useInMatching === "Required Match" || m.useInMatching === "Optional Check")
    );

    optionalMappings.forEach(m => {
      const fieldKey = m.suggestedField as keyof InvoiceLine;
      const invoiceValue = String(updatedLine[fieldKey] || "").trim();
      const compareTarget = m.compareAgainst; // e.g. "po.businessRegTaxId" or "grn.businessRegTaxId"
      
      if (isMissingValue(invoiceValue)) {
        // If invoice optional field is missing, do not generate a discrepancy
        return;
      }

      let targetValue = "";
      let targetDocName = "";
      let isTargetMissing = true;
      
      if (compareTarget === "po.supplier") {
        targetDocName = `PO ${updatedLine.poNumber}`;
        if (matchingPOs.length > 0) {
          targetValue = String(matchingPOs[0].supplier || "").trim();
          isTargetMissing = isMissingValue(matchingPOs[0].supplier);
        }
      } else if (compareTarget === "grn.supplier") {
        targetDocName = `GRN for PO ${updatedLine.poNumber}`;
        const matchingGRNs = grnLines.filter(
          (grn) => normalizeText(grn.poNumber) === normalizeText(updatedLine.poNumber)
        );
        if (matchingGRNs.length > 0) {
          targetValue = String(matchingGRNs[0].supplier || "").trim();
          isTargetMissing = isMissingValue(matchingGRNs[0].supplier);
        }
      } else if (compareTarget === "po.businessRegTaxId") {
        targetDocName = `PO ${updatedLine.poNumber}`;
        if (matchingPOs.length > 0) {
          targetValue = String(matchingPOs[0].businessRegTaxId || "").trim();
          isTargetMissing = isMissingValue(matchingPOs[0].businessRegTaxId);
        }
      } else if (compareTarget === "grn.businessRegTaxId") {
        targetDocName = `GRN for PO ${updatedLine.poNumber}`;
        const matchingGRNs = grnLines.filter(
          (grn) => normalizeText(grn.poNumber) === normalizeText(updatedLine.poNumber)
        );
        if (matchingGRNs.length > 0) {
          targetValue = String(matchingGRNs[0].businessRegTaxId || "").trim();
          isTargetMissing = isMissingValue(matchingGRNs[0].businessRegTaxId);
        }
      } else if (compareTarget === "po.supplierContactDetails") {
        targetDocName = `PO ${updatedLine.poNumber}`;
        if (matchingPOs.length > 0) {
          targetValue = String(matchingPOs[0].supplierContactDetails || "").trim();
          isTargetMissing = isMissingValue(matchingPOs[0].supplierContactDetails);
        }
      } else if (compareTarget === "grn.supplierContactDetails") {
        targetDocName = `GRN for PO ${updatedLine.poNumber}`;
        const matchingGRNs = grnLines.filter(
          (grn) => normalizeText(grn.poNumber) === normalizeText(updatedLine.poNumber)
        );
        if (matchingGRNs.length > 0) {
          targetValue = String(matchingGRNs[0].supplierContactDetails || "").trim();
          isTargetMissing = isMissingValue(matchingGRNs[0].supplierContactDetails);
        }
      } else {
        // Unrecognized or no comparison target, skip
        return;
      }
      
      // Only generate discrepancy if BOTH are present (not missing) and they disagree
      if (!isTargetMissing) {
        const normInv = normalizeText(invoiceValue);
        const normTarget = normalizeText(targetValue);
        
        if (normInv !== normTarget) {
          const fieldLabel = m.originalColumn || m.suggestedField;
          const isHold = m.useInMatching === "Required Match";
          const severity = isHold ? ("On Hold" as const) : ("Review Required" as const);
          
          exceptions.push({
            type: `${m.suggestedField === "businessRegTaxId" ? "Tax ID" : "Optional Field"} Verification Discrepancy`,
            severity: severity,
            reason: `Discrepancy in optional field "${fieldLabel}": Invoice has "${invoiceValue}", but ${targetDocName} records "${targetValue}".`,
            suggestedFollowupParty: "Procurement and Accounts Payable",
            followupStatus: isHold ? "Pending Investigation" : "Under Review",
            requiredAction: isHold 
              ? `Verification is Required. Payment on hold until Tax ID/Metadata discrepancy is manually resolved or supplier details are corrected.`
              : `Review recommended. Verify supplier identifier alignment across documents for compliance tracking.`
          });
        }
      }
    });

    // Check math first
    if (calculationError) {
      exceptions.push({
        type: "Mathematical Calculation Error",
        severity: "On Hold",
        reason: `Line amount on invoice is $${formatMoney(updatedLine.lineAmount)}, but mathematical calculation (Qty ${updatedLine.quantityInvoiced} * Price $${formatMoney(updatedLine.unitPrice)}) is $${formatMoney(expectedLineAmount)}. Difference: $${formatMoney(Math.abs(lineAmt - expectedLineAmount))}.`,
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        numericalDifference: `$${formatMoney(Math.abs(lineAmt - expectedLineAmount))}`,
        requiredAction: "Verify mathematical calculations on the invoice or contact the supplier."
      });
    }

    // Check same-batch internal duplicates separately
    const isConfirmedDuplicate = updatedLine.duplicateReviewDecision === "Confirmed Duplicate";
    
    if (isConfirmedDuplicate) {
      exceptions.push({
        type: "Confirmed Duplicate",
        severity: "On Hold",
        reason: `Manually confirmed as a duplicate by ${updatedLine.duplicateReviewerName}. Original Record ID: ${updatedLine.duplicateIdentifiedOriginalId || 'Unknown'}`,
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Keep on Hold",
        requiredAction: "Do not process this invoice."
      });
    } else if (isInternalDuplicate && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {
      exceptions.push({
        type: "Batch Duplicate Warning",
        severity: "On Hold",
        reason: "Identified a potential duplicate invoice within the current batch (either exact matching details or same invoice number).",
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        requiredAction: "Verify if this invoice is a double entry."
      });
    } else if (isHistoricalDuplicate && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {
      exceptions.push({
        type: "Historical Duplicate Warning",
        severity: "On Hold",
        reason: "Invoice number already exists in the historical invoice register.",
        suggestedFollowupParty: "Accounts Payable",
        followupStatus: "Pending Investigation",
        requiredAction: "Verify if this invoice has already been processed previously."
      });
    }

    // Check invoice register extraction duplicates separately
    if (hasExternalDuplicateWarning && updatedLine.duplicateReviewDecision !== "Not a Duplicate") {
      if (!updatedLine.duplicateOf) {
        exceptions.push({
          type: "Invoice Register Duplicate Warning",
          severity: "On Hold",
          reason: "Duplicate reference missing—this invoice was flagged by the invoice-extraction stage, but the suspected comparison record was not provided.",
          suggestedFollowupParty: "Accounts Payable",
          followupStatus: "Pending Investigation",
          requiredAction: "Provide comparison record or verify manually."
        });
      } else {
        exceptions.push({
          type: "Invoice Register Duplicate Warning",
          severity: "On Hold",
          reason: `Duplicate warning flagged by the invoice extraction system (Extraction duplicate status: ${updatedLine.duplicateStatus}).`,
          suggestedFollowupParty: "Accounts Payable",
          followupStatus: "Pending Investigation",
          requiredAction: "Review historic transactions in ledger to ensure this invoice is not a duplicate."
        });
      }
    }

    // Check extraction quality issues
    if (hasExtractionIssues) {
      exceptions.push({
        type: "Invoice Extraction Problem",
        severity: "On Hold",
        reason: `Invoice register shows unresolved extraction issues: ${updatedLine.fieldsRequiringReview || updatedLine.extractionStatus || "Unclear fields"}.`,
        suggestedFollowupParty: "Accounts Payable and the invoice reviewer",
        followupStatus: "Pending Investigation",
        requiredAction: "Manually review the document and update mappings or verify fields."
      });
    }

    // Check PO presence
    if (matchingPOs.length === 0) {
      exceptions.push({
        type: "Missing Purchase Order",
        severity: "On Hold",
        reason: `No Purchase Order (PO ${updatedLine.poNumber}) was found in the system.`,
        suggestedFollowupParty: "Procurement",
        followupStatus: "Pending Investigation",
        requiredAction: "Verify that the PO exists in the procurement system and import the correct PO details."
      });
    } else {
      // PO exists. Let's find matched PO line
      let matchedPO: POLine | undefined = matchingPOs.find(
        (po) => String(po.itemDescription).trim() === String(updatedLine.itemDescription).trim()
      );

      if (!matchedPO) {
        matchedPO = matchingPOs.find((po) => isDescriptionMatch(po.itemDescription, updatedLine.itemDescription));
      }

      if (!matchedPO) {
        exceptions.push({
          type: "PO Line Item Mismatch",
          severity: "On Hold",
          reason: `The item "${updatedLine.itemDescription}" does not match any items ordered in PO ${updatedLine.poNumber}.`,
          suggestedFollowupParty: "Procurement",
          followupStatus: "Pending Investigation",
          requiredAction: "Verify item descriptions on both documents or check if the wrong item was invoiced."
        });

        // Check supplier header mismatch since PO exists
        const supplierMismatch = normalizeText(matchingPOs[0].supplier) !== normalizeText(updatedLine.supplierName);
        if (supplierMismatch) {
          exceptions.push({
            type: "Supplier Name Mismatch",
            severity: "On Hold",
            reason: `Invoice supplier is "${updatedLine.supplierName}", but PO ${updatedLine.poNumber} is issued to "${matchingPOs[0].supplier}".`,
            suggestedFollowupParty: "Procurement and Accounts Payable",
            followupStatus: "Pending Investigation",
            requiredAction: "Verify if the supplier has multiple legal names or if the wrong PO number was referenced on the invoice."
          });
        }

        // Check missing Goods Received Notes
        const matchingGRNs = grnLines.filter(
          (grn) => normalizeText(grn.poNumber) === normalizeText(updatedLine.poNumber)
        );
        if (matchingGRNs.length === 0) {
          exceptions.push({
            type: "Missing Goods Received Note",
            severity: "On Hold",
            reason: `Goods Received Note (GRN) is missing for PO ${updatedLine.poNumber}. Delivery has not been verified.`,
            suggestedFollowupParty: "Procurement",
            followupStatus: "Pending Investigation",
            requiredAction: "Contact the logistics or warehouse team to verify if the goods have been received."
          });
        }
      } else {
        // Matched PO line exists
        // Supplier Name Mismatch
        const supplierMismatch = normalizeText(matchedPO.supplier) !== normalizeText(updatedLine.supplierName);
        if (supplierMismatch) {
          exceptions.push({
            type: "Supplier Name Mismatch",
            severity: "On Hold",
            reason: `Invoice supplier is "${updatedLine.supplierName}", but PO ${updatedLine.poNumber} is issued to "${matchedPO.supplier}".`,
            suggestedFollowupParty: "Procurement and Accounts Payable",
            followupStatus: "Pending Investigation",
            requiredAction: "Verify if the supplier has multiple legal names or if the wrong PO number was referenced on the invoice."
          });
        }

        // Check if PO requires verification
        const unverifiedPO = matchedPO.sourceType === "extracted" && !matchedPO.verifiedRecord;
        if (unverifiedPO) {
          exceptions.push({
            type: "Unverified Supporting Documents",
            severity: "On Hold",
            reason: `AI-extracted data for PO has not been human-verified and confirmed.`,
            suggestedFollowupParty: "document reviewer and relevant department",
            followupStatus: "Pending Investigation",
            requiredAction: "Complete the manual review and verification for PO in Step 2."
          });
        }

        // Check price differences
        const priceDiff = Math.abs(updatedLine.unitPrice - matchedPO.unitPrice);
        if (priceDiff >= 0.01) {
          const totalAmountDiff = priceDiff * updatedLine.quantityInvoiced;
          exceptions.push({
            type: "Price Discrepancy",
            severity: "On Hold",
            reason: `Invoice unit price is $${formatMoney(updatedLine.unitPrice)}, but PO ${updatedLine.poNumber} price is $${formatMoney(matchedPO.unitPrice)}. Difference per unit: $${formatMoney(priceDiff)}. Total amount difference: $${formatMoney(totalAmountDiff)}.`,
            suggestedFollowupParty: "Procurement",
            followupStatus: "Pending Investigation",
            numericalDifference: `$${formatMoney(priceDiff)} / total $${formatMoney(totalAmountDiff)}`,
            requiredAction: "Review contract terms or negotiate pricing alignment with the vendor."
          });
        }

        // Check invoiced quantity exceeding ordered quantity
        if (updatedLine.quantityInvoiced > matchedPO.quantityOrdered) {
          exceptions.push({
            type: "Excess Quantity Ordered",
            severity: "On Hold",
            reason: `Invoice quantity of ${updatedLine.quantityInvoiced} exceeds ordered quantity of ${matchedPO.quantityOrdered} on PO ${updatedLine.poNumber}. Difference: ${updatedLine.quantityInvoiced - matchedPO.quantityOrdered} units.`,
            suggestedFollowupParty: "Procurement",
            followupStatus: "Pending Investigation",
            numericalDifference: `${updatedLine.quantityInvoiced - matchedPO.quantityOrdered} units`,
            requiredAction: "Authorize the extra quantity via a PO amendment or request a credit note."
          });
        }

        // GRN checks
        const matchingGRNs = grnLines.filter(
          (grn) => normalizeText(grn.poNumber) === normalizeText(updatedLine.poNumber)
        );

        if (matchingGRNs.length === 0) {
          exceptions.push({
            type: "Missing Goods Received Note",
            severity: "On Hold",
            reason: `Goods Received Note (GRN) is missing for PO ${updatedLine.poNumber}. Delivery has not been verified.`,
            suggestedFollowupParty: "Procurement",
            followupStatus: "Pending Investigation",
            requiredAction: "Request warehouse confirmation of receipt."
          });
        } else {
          // Find GRN lines for item
          let itemGRNs = matchingGRNs.filter(
            (grn) => String(grn.itemDescription).trim() === String(updatedLine.itemDescription).trim()
          );
          if (itemGRNs.length === 0) {
            itemGRNs = matchingGRNs.filter((grn) => isDescriptionMatch(grn.itemDescription, updatedLine.itemDescription));
          }

          if (itemGRNs.length === 0) {
            exceptions.push({
              type: "No Delivery Record for Item",
              severity: "On Hold",
              reason: `No Goods Received Note (GRN) shows delivery for item "${updatedLine.itemDescription}" under PO ${updatedLine.poNumber}.`,
              suggestedFollowupParty: "Logistics Inbound",
              followupStatus: "Pending Investigation",
              requiredAction: "Verify receipt of this specific item description with warehouse teams."
            });
          } else {
            // Check total receipt quantity
            const totalQtyReceived = itemGRNs.reduce((sum, grn) => sum + grn.quantityReceived, 0);
            const grnNumbers = itemGRNs.map((g) => g.grnNumber).join(", ");
            const grnReceivers = Array.from(new Set(itemGRNs.map((g) => g.receivedBy).filter(Boolean))).join(", ");

            const unverifiedGRN = itemGRNs.some((g) => g.sourceType === "extracted" && !g.verifiedRecord);
            if (unverifiedGRN) {
              exceptions.push({
                type: "Unverified Supporting Documents",
                severity: "On Hold",
                reason: `AI-extracted data for GRN (${grnNumbers}) has not been human-verified and confirmed.`,
                suggestedFollowupParty: "document reviewer and relevant department",
                followupStatus: "Pending Investigation",
                requiredAction: "Complete the manual review and verification for GRNs in Step 2."
              });
            }

            if (updatedLine.quantityInvoiced > totalQtyReceived) {
              exceptions.push({
                type: "Excess Quantity Invoiced",
                severity: "On Hold",
                reason: `Invoice quantity is ${updatedLine.quantityInvoiced} units, but GRN (${grnNumbers}) records only ${totalQtyReceived} units received. Difference: ${updatedLine.quantityInvoiced - totalQtyReceived} units.`,
                suggestedFollowupParty: "Logistics Inbound" + (grnReceivers ? ` (Contact: ${grnReceivers})` : ""),
                followupStatus: "Pending Investigation",
                numericalDifference: `${updatedLine.quantityInvoiced - totalQtyReceived} units`,
                requiredAction: "Hold payment or request credit note from the supplier for the undelivered items."
              });
            }

            // Check damaged condition
            const damagedGRN = itemGRNs.find((g) => normalizeText(g.condition) !== "good");
            if (damagedGRN) {
              exceptions.push({
                type: "Damaged Goods Condition",
                severity: "Review Required",
                reason: `GRN ${damagedGRN.grnNumber} states delivery condition is "${damagedGRN.condition}". Requires quality review.`,
                suggestedFollowupParty: "Logistics Inbound" + (damagedGRN.receivedBy ? ` (Received By: ${damagedGRN.receivedBy})` : ""),
                followupStatus: "Pending Investigation",
                requiredAction: "Inspect damaged items to determine if they should be returned or if vendor should credit."
              });
            }
          }
        }

        // Fuzzy description match warning (only if there are no On Hold item mismatches)
        const exactDescMatch = String(matchedPO.itemDescription).trim() === String(updatedLine.itemDescription).trim();
        if (!exactDescMatch) {
          exceptions.push({
            type: "Item Description Equivalence",
            severity: "Review Required",
            reason: `Invoice item description is "${updatedLine.itemDescription}" but PO records "${matchedPO.itemDescription}". Verification required.`,
            suggestedFollowupParty: "Procurement",
            followupStatus: "Pending Investigation",
            requiredAction: "Confirm description equivalence with the buyer or the requisitioning department."
          });
        }
      }
    }

    // Determine overall status using the most serious exception
    let worstSeverity: "On Hold" | "Review Required" | "Matched – Awaiting Department Approval" = "Matched – Awaiting Department Approval";
    if (exceptions.some((e) => e.severity === "On Hold")) {
      worstSeverity = "On Hold";
    } else if (exceptions.some((e) => e.severity === "Review Required")) {
      worstSeverity = "Review Required";
    }

    if (exceptions.length === 0) {
      const grnNumbers = grnLines.filter((g) => normalizeText(g.poNumber) === normalizeText(updatedLine.poNumber)).map((g) => g.grnNumber).join(", ");
      updatedLine.overallStatus = "Matched – Awaiting Department Approval";
      updatedLine.exceptionType = "None";
      updatedLine.reason = `Invoice matches PO ${updatedLine.poNumber} and Goods Received Notes (${grnNumbers || "None"}) perfectly. Quantities and pricing correspond.`;
      updatedLine.suggestedFollowupParty = "End User Department";
      updatedLine.followupStatus = "Awaiting Department Approval";
    } else {
      updatedLine.overallStatus = worstSeverity;
      const primaryEx = exceptions.find((e) => e.severity === worstSeverity) || exceptions[0];
      updatedLine.exceptionType = primaryEx.type;
      updatedLine.reason = primaryEx.reason;
      updatedLine.suggestedFollowupParty = primaryEx.suggestedFollowupParty;
      updatedLine.followupStatus = primaryEx.followupStatus as any;
    }

    updatedLine.exceptions = exceptions;
    return updatedLine;
  });

  // Apply human review overrides if present
  const overriddenLines = matchedLines.map((line): InvoiceLine => {
    if (line.humanReview) {
      const decision = line.humanReview.reviewDecision;
      const overriddenStatus = (decision === "Resolved – Send for Department Approval"
        ? "Matched – Awaiting Department Approval"
        : decision === "Keep on Hold"
        ? "On Hold"
        : "Review Required") as InvoiceLine["overallStatus"];
      return {
        ...line,
        overallStatus: overriddenStatus,
        followupStatus: decision,
      };
    }
    return line;
  });

  // Step 3: Roll up line results to invoice headers (using severity score)
  const severityScore = {
    "On Hold": 4,
    "Review Required": 3,
    "Matched – Awaiting Department Approval": 1,
  };

  const invoiceNumberToMaxSeverityLine = new Map<string, InvoiceLine>();
  overriddenLines.forEach((line) => {
    const existing = invoiceNumberToMaxSeverityLine.get(line.invoiceNumber);
    if (!existing) {
      invoiceNumberToMaxSeverityLine.set(line.invoiceNumber, line);
    } else {
      const existingScore = severityScore[existing.overallStatus || "Matched – Awaiting Department Approval"] || 0;
      const currentScore = severityScore[line.overallStatus || "Matched – Awaiting Department Approval"] || 0;
      if (currentScore > existingScore) {
        invoiceNumberToMaxSeverityLine.set(line.invoiceNumber, line);
      }
    }
  });

  // Apply maximum severity to all lines belonging to the same invoice number
  return overriddenLines.map((line) => {
    const worstLine = invoiceNumberToMaxSeverityLine.get(line.invoiceNumber);
    if (worstLine && worstLine.overallStatus !== line.overallStatus) {
      return {
        ...line,
        overallStatus: worstLine.overallStatus,
        reason: `${line.reason} (Note: Entire invoice is ${worstLine.overallStatus} due to an issue on item "${worstLine.itemDescription}": ${worstLine.reason})`,
        exceptionType: worstLine.exceptionType,
        suggestedFollowupParty: worstLine.suggestedFollowupParty,
        followupStatus: worstLine.followupStatus
      };
    }
    return line;
  });
}
