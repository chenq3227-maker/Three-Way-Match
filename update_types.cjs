const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const poReplacement = `export interface POLine {
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
}`;

const grnReplacement = `export interface GRNLine {
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
}`;

code = code.replace(/export interface POLine \{[\s\S]*?verifiedAt: string;\n  \};\n\}/, poReplacement);
code = code.replace(/export interface GRNLine \{[\s\S]*?verifiedAt: string;\n  \};\n\}/, grnReplacement);

fs.writeFileSync('src/types.ts', code);
console.log("Updated src/types.ts");
