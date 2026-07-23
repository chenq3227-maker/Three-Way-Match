/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InvoiceLine {
  recordId: string;
  sourceFileName: string;
  sourceFileSize?: number;
  sourceFileHash?: string;
  sourceWorkbookName?: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string; // stored as DD/MM/YYYY
  invoiceDueDate: string; // stored as DD/MM/YYYY
  billTo: string;
  poNumber: string;
  lineNumber: string;
  itemDescription: string;
  quantityInvoiced: number;
  unitPrice: number;
  lineAmount: number;
  subtotal: number;
  gst: number;
  invoiceTotal: number;
  currency: string;
  duplicateStatus: "Clear" | "Possible Duplicate" | "Exact Duplicate" | "Not Checked";
  duplicateOf?: string;
  duplicateCheckSource?: "Same-Batch Duplicate" | "Historical Duplicate" | "Upstream Duplicate Warning";
  duplicateGroupId?: string;
  duplicateCandidateRecordId?: string;
  duplicateCandidateInvoiceNumber?: string;
  duplicateCandidateSourceFile?: string;
  duplicateReason?: string;
  duplicateReviewDecision?: "Confirmed Duplicate" | "Not a Duplicate" | "Pending Investigation";
  duplicateReviewNotes?: string;
  duplicateReviewerName?: string;
  duplicateIdentifiedOriginalId?: string;
  extractionStatus: string;
  fieldsRequiringReview: string;
  extractionNotes: string;

  // Granular line-item calculations and App 1 specifics
  grossLineAmount?: number;
  lineDiscount?: number;
  lineTaxRate?: number;
  lineTax?: number;
  netLineTotal?: number;
  expectedNetLineTotal?: number;
  importValidationStatus?: "Ready for Match" | "Review Required" | "Blocked";
  importValidationReason?: string;
  worksheetOrigin?: string;
  confirmedByHuman?: boolean;
  originalSummaryRow?: Record<string, any>;
  originalGranularRow?: Record<string, any>;
  mappingChangeHistory?: Array<{
    originalColumn: string;
    previousMappedField: string | null;
    newMappedField: string | null;
    changedBy: string;
    timestamp: string;
  }>;
  originalSystemMappingResult?: Record<string, any>;
  
  // Extra preserved information
  supplierAddress?: string;
  bankDetails?: string;
  bankAccountOrIban?: string;
  paymentReference?: string;
  paymentTerms?: string;
  supplierContactDetails?: string;
  businessRegTaxId?: string;
  acceptedPaymentMethod?: string;
  latePaymentTerms?: string;

  // Raw mapping fields
  originalData?: Record<string, any>;
  dateParserVersion?: string;

  // Calculated matching results
  calculatedLineAmount?: number;
  overallStatus?: "Matched – Awaiting Department Approval" | "Review Required" | "On Hold";
  exceptionType?: string;
  reason?: string;
  suggestedFollowupParty?: string;
  followupStatus?: "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval" | "Awaiting Department Approval";
  
  // Human review overrides
  humanReview?: {
    reviewerName: string;
    reviewDecision: "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval";
    notes: string;
    timestamp: string;
  };
  // Audit log of changes
  auditLog?: Array<{
    timestamp: string;
    previousStatus: string;
    updatedStatus: string;
    reason: string;
    triggerType: "rematch" | "human_override";
    details?: string;
  }>;
  exceptions?: Array<{
    type: string;
    severity: "On Hold" | "Review Required";
    reason: string;
    suggestedFollowupParty: string;
    followupStatus: string;
    numericalDifference?: string;
    requiredAction?: string;
  }>;
}

export interface POLine {
  id: string; // Generated frontend ID
  poNumber: string;
  poDate: string; // stored as DD/MM/YYYY
  buyer?: string;
  supplier: string;
  supplierAddress?: string;
  currency?: string;
  deliveryLocation?: string;
  paymentTerms?: string;
  lineNumber?: string;
  itemDescription: string;
  quantityOrdered: number;
  unitPrice: number;
  totalAmount: number;
  expectedDelivery: string; // stored as DD/MM/YYYY
  sourceFileName: string;
  sourceFileSize?: number;
  sourceFileHash?: string;
  sourceWorkbookName?: string;
  sourceType: "excel" | "extracted";
  businessRegTaxId?: string;
  supplierContactDetails?: string;
  
  // Extraction quality tracing
  extractionQuality?: {
    poNumber: ExtractedFieldStatus;
    poDate: ExtractedFieldStatus;
    buyer?: ExtractedFieldStatus;
    supplier: ExtractedFieldStatus;
    supplierAddress?: ExtractedFieldStatus;
    currency?: ExtractedFieldStatus;
    deliveryLocation?: ExtractedFieldStatus;
    paymentTerms?: ExtractedFieldStatus;
    lineNumber?: ExtractedFieldStatus;
    itemDescription: ExtractedFieldStatus;
    quantityOrdered: ExtractedFieldStatus;
    unitPrice: ExtractedFieldStatus;
    totalAmount: ExtractedFieldStatus;
    expectedDelivery: ExtractedFieldStatus;
  };
  originalValues?: Record<string, any>; // Preserve values before human correction
  dateParserVersion?: string;
  verifiedRecord?: {
    reviewerName: string;
    verifiedAt: string;
  };
}

export interface GRNLine {
  id: string; // Generated frontend ID
  grnNumber: string;
  grnDate: string; // stored as DD/MM/YYYY
  poNumber: string;
  supplier: string;
  warehouse?: string;
  signaturePresent?: boolean;
  remarks?: string;
  itemDescription: string;
  quantityOrdered?: number;
  quantityReceived: number;
  condition: string; // Good, Damaged, Poor, etc.
  receivedBy: string;
  sourceFileName: string;
  sourceFileSize?: number;
  sourceFileHash?: string;
  sourceWorkbookName?: string;
  sourceType: "excel" | "extracted";
  businessRegTaxId?: string;
  supplierContactDetails?: string;
  
  // Extraction quality tracing
  extractionQuality?: {
    grnNumber: ExtractedFieldStatus;
    grnDate: ExtractedFieldStatus;
    poNumber: ExtractedFieldStatus;
    supplier: ExtractedFieldStatus;
    warehouse?: ExtractedFieldStatus;
    signaturePresent?: ExtractedFieldStatus;
    remarks?: ExtractedFieldStatus;
    itemDescription: ExtractedFieldStatus;
    quantityOrdered?: ExtractedFieldStatus;
    quantityReceived: ExtractedFieldStatus;
    condition: ExtractedFieldStatus;
    receivedBy: ExtractedFieldStatus;
  };
  originalValues?: Record<string, any>; // Preserve values before human correction
  dateParserVersion?: string;
  verifiedRecord?: {
    reviewerName: string;
    verifiedAt: string;
  };
}

export type ExtractedFieldStatus = "clear" | "uncertain" | "missing" | "human corrected";

export interface ColumnMapping {
  originalColumn: string;
  suggestedField: string | null;
  status: "automatically mapped" | "confirmation required" | "unmapped" | "ignored";
  sampleValue: string;
  useInMatching?: "Required Match" | "Optional Check" | "Reference Only";
  compareAgainst?: string | null;
}

export interface FileData {
  name: string;
  type: string;
  dataUrl: string;
  size: string;
}

export interface MatchSummary {
  totalInvoices: number;
  totalInvoiceLines: number;
  matched: number;
  reviewRequired: number;
  onHold: number;
  totalInvoiceValue: number;
  totalValueOnHold: number;
}

export interface DateStandardisationRecord {
  id: string;
  worksheet: string;
  recordId: string;
  originalColumn: string;
  fieldKey: string;
  originalValue: string;
  detectedFormat: string;
  standardisedDate: string;
  alternativeInterpretation?: string;
  detectionMethod: string;
  reviewStatus: "Automatically Standardised" | "Confirmation Required" | "Human Corrected" | "Invalid Date";
  confirmedBy?: string;
  confirmedAt?: string;
  userCorrection?: string;
  isAmbiguous?: boolean;
}

