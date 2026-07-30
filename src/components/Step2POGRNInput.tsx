import { getFormattedTimestamp } from "../lib/timestamp";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  FileSpreadsheet, FileText, Upload, CheckCircle2, AlertTriangle, HelpCircle, 
  Trash2, Plus, ArrowRight, Eye, RefreshCw, UserCheck, ShieldCheck, Download, Edit2
} from "lucide-react";
import { motion } from "motion/react";
import { POLine, GRNLine, ExtractedFieldStatus, FileData } from "../types";
import { parseExcelFile, formatDate, formatCurrencyValue } from "../lib/excelParser";
import { downloadSamplePOGRNData } from "../lib/sampleGenerator";

interface Props {
  poLines: POLine[];
  grnLines: GRNLine[];
  onDataConfirmed: (pos: POLine[], grns: GRNLine[]) => void;
  onBack: () => void;
}

export default function Step2POGRNInput({ poLines, grnLines, onDataConfirmed, onBack }: Props) {
  const [inputMethod, setInputMethod] = useState<"excel" | "ai_scan">("excel");
  const [localPOs, setLocalPOs] = useState<POLine[]>(poLines);
  const [localGRNs, setLocalGRNs] = useState<GRNLine[]>(grnLines);
  
  // Excel states
  const [aiStatus, setAiStatus] = useState<string>("Ready");
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelSuccess, setExcelSuccess] = useState<string | null>(null);
  const [pendingExcelData, setPendingExcelData] = useState<any | null>(null);
  const [showMappingReview, setShowMappingReview] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // AI OCR states
  const [scanDocType, setScanDocType] = useState<"po" | "grn">("po");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pendingScans, setPendingScans] = useState<{file: FileData, extractedData: any, docType: "po"|"grn", error?: string, diagnostics?: any}[]>([]);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const currentScan = pendingScans[currentScanIndex];
  const extractedData = currentScan?.extractedData || null;
  const uploadedFile = currentScan?.file || null;
  const currentScanDocType = currentScan?.docType || "po";
  const [reviewerName, setReviewerName] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");

  // Manual PO/GRN Form States
  const [showManualPOForm, setShowManualPOForm] = useState(false);
  const [showManualGRNForm, setShowManualGRNForm] = useState(false);
  
  // PO manual fields
  const [mPoNo, setMPoNo] = useState("");
  const [mPoDate, setMPoDate] = useState("");
  const [mPoSupplier, setMPoSupplier] = useState("");
  const [mPoItemDesc, setMPoItemDesc] = useState("");
  const [mPoQty, setMPoQty] = useState<number | "">("");
  const [mPoPrice, setMPoPrice] = useState<number | "">("");
  const [mPoTotal, setMPoTotal] = useState<number | "">("");
  const [mPoDelivery, setMPoDelivery] = useState("");

  // GRN manual fields
  const [mGrnNo, setMGrnNo] = useState("");
  const [mGrnDate, setMGrnDate] = useState("");
  const [mGrnPoNo, setMGrnPoNo] = useState("");
  const [mGrnSupplier, setMGrnSupplier] = useState("");
  const [mGrnItemDesc, setMGrnItemDesc] = useState("");
  const [mGrnQty, setMGrnQty] = useState<number | "">("");
  const [mGrnCond, setMGrnCond] = useState("");
  const [mGrnRecvBy, setMGrnRecvBy] = useState("");

  // Manual PO and GRN Line Handlers
  const handleManualPOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mPoNo || !mPoSupplier || !mPoItemDesc || !mPoQty || !mPoPrice) {
      alert("Please fill in all required PO fields.");
      return;
    }
    const calculatedAmt = Number(mPoQty) * Number(mPoPrice);
    const finalAmt = mPoTotal !== "" ? Number(mPoTotal) : calculatedAmt;

    const newPO: POLine = {
      id: `PO-${mPoNo}-${Math.floor(Math.random() * 1000)}`,
      poNumber: mPoNo,
      poDate: formatDate(mPoDate || getFormattedTimestamp().slice(0, 10)),
      supplier: mPoSupplier,
      itemDescription: mPoItemDesc,
      quantityOrdered: Number(mPoQty),
      unitPrice: Number(mPoPrice),
      totalAmount: finalAmt,
      expectedDelivery: formatDate(mPoDelivery),
      sourceFileName: "Manual Entry",
      sourceWorkbookName: "Manual Entry",
      sourceType: "extracted",
      dateParserVersion: "v2-date-only"
    };

    setLocalPOs(prev => [...prev, newPO]);
    setMPoItemDesc("");
    setMPoQty("");
    setMPoPrice("");
    setMPoTotal("");
    setShowManualPOForm(false);
  };

  const handleManualGRNSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mGrnNo || !mGrnPoNo || !mGrnItemDesc || !mGrnQty) {
      alert("Please fill in all required GRN fields.");
      return;
    }

    const newGRN: GRNLine = {
      id: `GRN-${mGrnNo}-${Math.floor(Math.random() * 1000)}`,
      grnNumber: mGrnNo,
      grnDate: formatDate(mGrnDate || getFormattedTimestamp().slice(0, 10)),
      poNumber: mGrnPoNo,
      supplier: mGrnSupplier || "",
      itemDescription: mGrnItemDesc,
      quantityReceived: Number(mGrnQty),
      condition: mGrnCond,
      receivedBy: mGrnRecvBy || "",
      sourceFileName: "Manual Entry",
      sourceWorkbookName: "Manual Entry",
      sourceType: "extracted",
      dateParserVersion: "v2-date-only"
    };

    setLocalGRNs(prev => [...prev, newGRN]);
    setMGrnItemDesc("");
    setMGrnQty("");
    setMGrnCond("Good");
    setMGrnRecvBy("");
    setShowManualGRNForm(false);
  };

  // ----------------------------------------------------------------------
  // Method 1: Excel Loader & Mapper
  // ----------------------------------------------------------------------
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setExcelLoading(true);
    setExcelError(null);
    setExcelSuccess(null);
    setReviewerName("");
    setVerificationNotes("");

    try {
      const parsed = await parseExcelFile(file);
      
      // Let's inspect which sheets are in the file and parse PO / GRN rows.
      // We search for PO and GRN indicators in sheets
      const poSheetName = parsed.sheetNames.find(s => s.toLowerCase().includes("po") || s.toLowerCase().includes("purchase") || s.toLowerCase().includes("order")) || parsed.sheetNames[0];
      const grnSheetName = parsed.sheetNames.find(s => s.toLowerCase().includes("grn") || s.toLowerCase().includes("good") || s.toLowerCase().includes("received") || s.toLowerCase().includes("note")) || parsed.sheetNames[1] || parsed.sheetNames[0];

      // Re-read workbook for PO sheet specifically
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(event.target?.result, { type: "array", cellDates: true });
          const is1904 = !!wb.Workbook?.WBProps?.date1904;
          
          let poRows: any[] = [];
          let grnRows: any[] = [];

          if (wb.Sheets[poSheetName]) {
            poRows = XLSX.utils.sheet_to_json<any>(wb.Sheets[poSheetName]);
          }
          if (wb.Sheets[grnSheetName]) {
            grnRows = XLSX.utils.sheet_to_json<any>(wb.Sheets[grnSheetName]);
          }

          // Dynamic field mapping heuristic for PO & GRN Excel Upload
          const poMappings: any[] = [];
          if (poRows.length > 0) {
            const keys = Object.keys(poRows[0]);
            const getValKey = (possibleHeaders: string[]) => keys.find(key => possibleHeaders.some(h => key.toLowerCase().replace(/[^a-z0-9]/g, "").includes(h)));
            
            poMappings.push({ field: "PO Number", mappedTo: getValKey(["ponumber", "poid", "purchaseorder"]) || "Unmapped", sample: String(poRows[0][getValKey(["ponumber", "poid", "purchaseorder"]) || ""] || "") });
            poMappings.push({ field: "PO Date", mappedTo: getValKey(["podate", "issue", "date"]) || "Unmapped", sample: String(poRows[0][getValKey(["podate", "issue", "date"]) || ""] || "") });
            poMappings.push({ field: "Supplier", mappedTo: getValKey(["supplier", "vendor", "suppliername"]) || "Unmapped", sample: String(poRows[0][getValKey(["supplier", "vendor", "suppliername"]) || ""] || "") });
            poMappings.push({ field: "Item Description", mappedTo: getValKey(["itemdescription", "item", "description", "product", "ordereditem"]) || "Unmapped", sample: String(poRows[0][getValKey(["itemdescription", "item", "description", "product", "ordereditem"]) || ""] || "") });
            poMappings.push({ field: "Quantity Ordered", mappedTo: getValKey(["quantityordered", "qtyordered", "ordered", "quantity"]) || "Unmapped", sample: String(poRows[0][getValKey(["quantityordered", "qtyordered", "ordered", "quantity"]) || ""] || "") });
          }

          const newPOs: POLine[] = poRows.map((row, idx) => {
            // Find key by typical names
            const keys = Object.keys(row);
            const getVal = (possibleHeaders: string[]) => {
              const k = keys.find(key => possibleHeaders.some(h => key.toLowerCase().replace(/[^a-z0-9]/g, "").includes(h)));
              return k ? row[k] : "";
            };

            const poNum = String(getVal(["ponumber", "poid", "purchaseorder"]) || `PO-EXCEL-${idx+1}`);
            const itemDesc = String(getVal(["itemdescription", "item", "description", "product", "ordereditem"]) || "Unknown Item");

            return {
              id: `PO-${poNum}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              poNumber: poNum,
              poDate: formatDate(getVal(["podate", "issue", "date"]), is1904),
              supplier: String(getVal(["supplier", "vendor", "suppliername"]) || "Unknown Supplier"),
              itemDescription: itemDesc,
              quantityOrdered: Number(getVal(["quantityordered", "qtyordered", "ordered", "quantity"])) || 0,
              unitPrice: formatCurrencyValue(getVal(["unitprice", "rate", "price"])),
              totalAmount: formatCurrencyValue(getVal(["totalamount", "total", "amount"])),
              expectedDelivery: formatDate(getVal(["expecteddelivery", "deliverydate", "delivery"]), is1904),
              sourceFileName: file.name,
              sourceFileSize: file.size,
              sourceWorkbookName: file.name,
              sourceType: "excel" as "excel" | "extracted",
              businessRegTaxId: String(getVal(["businessreg", "taxid", "regid", "abn", "acn"]) || "").trim() || undefined,
              supplierContactDetails: String(getVal(["contact", "phone", "email"]) || "").trim() || undefined,
              dateParserVersion: "v2-date-only"
            };
          });

          const grnMappings: any[] = [];
          if (grnRows.length > 0) {
            const keys = Object.keys(grnRows[0]);
            const getValKey = (possibleHeaders: string[]) => keys.find(key => possibleHeaders.some(h => key.toLowerCase().replace(/[^a-z0-9]/g, "").includes(h)));
            
            grnMappings.push({ field: "GRN Number", mappedTo: getValKey(["grnnumber", "grnid", "note", "goodsreceived"]) || "Unmapped", sample: String(grnRows[0][getValKey(["grnnumber", "grnid", "note", "goodsreceived"]) || ""] || "") });
            grnMappings.push({ field: "GRN Date", mappedTo: getValKey(["grndate", "recorddate", "date"]) || "Unmapped", sample: String(grnRows[0][getValKey(["grndate", "recorddate", "date"]) || ""] || "") });
            grnMappings.push({ field: "PO Number", mappedTo: getValKey(["ponumber", "relatedpo", "associatedpo", "po"]) || "Unmapped", sample: String(grnRows[0][getValKey(["ponumber", "relatedpo", "associatedpo", "po"]) || ""] || "") });
            grnMappings.push({ field: "Item Description", mappedTo: getValKey(["itemdescription", "item", "description", "product", "receiveditem"]) || "Unmapped", sample: String(grnRows[0][getValKey(["itemdescription", "item", "description", "product", "receiveditem"]) || ""] || "") });
            grnMappings.push({ field: "Quantity Received", mappedTo: getValKey(["quantityreceived", "qtyreceived", "received", "quantity"]) || "Unmapped", sample: String(grnRows[0][getValKey(["quantityreceived", "qtyreceived", "received", "quantity"]) || ""] || "") });
          }

          const newGRNs: GRNLine[] = grnRows.map((row, idx) => {
            const keys = Object.keys(row);
            const getVal = (possibleHeaders: string[]) => {
              const k = keys.find(key => possibleHeaders.some(h => key.toLowerCase().replace(/[^a-z0-9]/g, "").includes(h)));
              return k ? row[k] : "";
            };

            const grnNum = String(getVal(["grnnumber", "grnid", "note", "goodsreceived"]) || `GRN-EXCEL-${idx+1}`);
            const itemDesc = String(getVal(["itemdescription", "item", "description", "product", "receiveditem"]) || "Unknown Item");

            return {
              id: `GRN-${grnNum}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              grnNumber: grnNum,
              grnDate: formatDate(getVal(["grndate", "recorddate", "date"]), is1904),
              poNumber: String(getVal(["ponumber", "relatedpo", "associatedpo", "po"]) || ""),
              supplier: String(getVal(["supplier", "vendor", "suppliername"]) || "Unknown Supplier"),
              itemDescription: itemDesc,
              quantityReceived: Number(getVal(["quantityreceived", "qtyreceived", "received", "quantity"])) || 0,
              condition: String(getVal(["condition", "physical", "status"]) || "Good"),
              receivedBy: String(getVal(["receivedby", "personnel", "officer", "signed"]) || "N/A"),
              sourceFileName: file.name,
              sourceFileSize: file.size,
              sourceWorkbookName: file.name,
              sourceType: "excel" as "excel" | "extracted",
              businessRegTaxId: String(getVal(["businessreg", "taxid", "regid", "abn", "acn"]) || "").trim() || undefined,
              supplierContactDetails: String(getVal(["contact", "phone", "email"]) || "").trim() || undefined,
              dateParserVersion: "v2-date-only"
            };
          }).filter(g => g.poNumber); // must have associated PO

          const isDuplicate = localPOs.some(p => p.sourceFileName === file.name && p.sourceFileSize === file.size) || localGRNs.some(g => g.sourceFileName === file.name && g.sourceFileSize === file.size);

          setPendingExcelData({ file, newPOs, newGRNs, isDuplicate, poMappings, grnMappings });
          setShowMappingReview(true);
        } catch (e: any) {
          setExcelError(`Error reading sheet details: ${e.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setExcelError(err.message || "Failed to parse PO/GRN Excel workbook.");
    } finally {
      setExcelLoading(false);
    }
  };

  const confirmExcelImport = (replaceExisting: boolean) => {
    if (!pendingExcelData) return;
    if (!reviewerName.trim()) {
      setExcelError("Auditor sign-off is mandatory to confirm PO/GRN Excel extraction mappings.");
      return;
    }
    
    let basePOs = replaceExisting ? localPOs.filter(p => p.sourceFileName !== pendingExcelData.file.name) : localPOs;
    let baseGRNs = replaceExisting ? localGRNs.filter(g => g.sourceFileName !== pendingExcelData.file.name) : localGRNs;

    // Apply verified records
    const verifiedRecord = {
      reviewerName,
      verifiedAt: `${getFormattedTimestamp()} - Notes: ${verificationNotes || "Mappings Confirmed"}`
    };
    
    const finalPOs = pendingExcelData.newPOs.map((p: any) => ({ ...p, verifiedRecord }));
    const finalGRNs = pendingExcelData.newGRNs.map((g: any) => ({ ...g, verifiedRecord }));

    setLocalPOs([...basePOs, ...finalPOs]);
    setLocalGRNs([...baseGRNs, ...finalGRNs]);
    setExcelSuccess(`Successfully imported ${finalPOs.length} Purchase Order lines and ${finalGRNs.length} Goods Received Note lines!`);
    setShowMappingReview(false);
    setPendingExcelData(null);
  };

  // ----------------------------------------------------------------------
  // Method 2: AI Document Extractor
  // ----------------------------------------------------------------------
  const handleDocScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files: File[] = Array.from(e.target.files);
    
    setScanError(null);
    const newScans: {file: FileData, extractedData: any, docType: "po"|"grn", error?: string, diagnostics?: any, status?: string}[] = [];
    
    for (const file of files) {
      try {
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const emptyData = scanDocType === "po" ? {
          poNumber: { value: "", status: "missing" },
          poDate: { value: "", status: "missing" },
          buyer: { value: "", status: "missing" },
          supplier: { value: "", status: "missing" },
          supplierAddress: { value: "", status: "missing" },
          currency: { value: "", status: "missing" },
          deliveryLocation: { value: "", status: "missing" },
          paymentTerms: { value: "", status: "missing" },
          expectedDelivery: { value: "", status: "missing" },
          totalAmount: { value: "", status: "missing" },
          items: []
        } : {
          grnNumber: { value: "", status: "missing" },
          grnDate: { value: "", status: "missing" },
          poNumber: { value: "", status: "missing" },
          supplier: { value: "", status: "missing" },
          warehouse: { value: "", status: "missing" },
          receivedBy: { value: "", status: "missing" },
          signaturePresent: { value: "false", status: "missing" },
          remarks: { value: "", status: "missing" },
          items: []
        };

        newScans.push({
          file: {
            name: file.name,
            type: file.type,
            dataUrl: base64Url,
            size: `${(file.size / 1024).toFixed(1)} KB`
          },
          extractedData: emptyData,
          docType: scanDocType,
          status: "pending_analysis"
        });
      } catch (err: any) {
        setScanError(err.message || `File read failed for ${file.name}.`);
      }
    }
    
    if (newScans.length > 0) {
      setPendingScans(prev => [...prev, ...newScans]);
    }
    
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
  };

  const handleAnalyseDocument = async (scanIndex: number) => {
    if (isQuotaExceeded) return;
    
    const scan = pendingScans[scanIndex];
    if (!scan) return;

    setScanLoading(true);
    setAiStatus("Extracting...");
    
    try {
      const response = await fetch("/api/extract-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: scan.file.dataUrl,
          fileType: scan.file.type || (scan.file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          docType: scan.docType
        })
      });

      if (response.status === 429) {
        setIsQuotaExceeded(true);
        setAiStatus("Quota Exceeded (429)");
        throw new Error("Daily AI extraction quota has been reached. Please retry after the quota resets or enter the information manually.");
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setAiStatus("Request Failed");
        throw new Error(errData.error || `Extraction server error (${response.status})`);
      }

      const jsonResponse = await response.json();
      const data = jsonResponse.data || jsonResponse;
      const diagnostics = jsonResponse.diagnostics || null;
      
      setAiStatus("Success");

      setPendingScans(prev => {
        const updated = [...prev];
        updated[scanIndex] = {
          ...updated[scanIndex],
          extractedData: data,
          diagnostics: diagnostics,
          status: "success",
          error: undefined
        };
        return updated;
      });
    } catch (err: any) {
      setPendingScans(prev => {
        const updated = [...prev];
        updated[scanIndex] = {
          ...updated[scanIndex],
          status: "error",
          error: err.message
        };
        return updated;
      });
    } finally {
      setScanLoading(false);
    }
  };

  // Field change handler for verification screen (human corrected tracking)
  const handleExtractedFieldChange = (fieldKey: string, newValue: any, itemIdx?: number, itemField?: string) => {
    setPendingScans((prev) => {
      const updatedScans = [...prev];
      if (!updatedScans[currentScanIndex] || !updatedScans[currentScanIndex].extractedData) return prev;
      
      const currentData = updatedScans[currentScanIndex].extractedData;
      const updatedData = { ...currentData };
      
      if (itemIdx !== undefined && itemField !== undefined) {
        // Update item list property
        const updatedItems = [...(updatedData.items || [])];
        updatedItems[itemIdx] = {
          ...updatedItems[itemIdx],
          [itemField]: {
            ...updatedItems[itemIdx]?.[itemField],
            value: newValue,
            status: "human corrected" as ExtractedFieldStatus
          }
        };
        updatedData.items = updatedItems;
      } else {
        // Update top-level field
        updatedData[fieldKey] = {
          ...updatedData[fieldKey],
          value: newValue,
          status: "human corrected" as ExtractedFieldStatus
        };
      }
      
      updatedScans[currentScanIndex] = {
        ...updatedScans[currentScanIndex],
        extractedData: updatedData
      };
      
      return updatedScans;
    });
  };

  // Confirm verification and add to system
  const handleVerifyExtractedDoc = () => {
    if (!reviewerName.trim()) {
      setScanError("Accounts Auditor verification signature (Reviewer Name) is mandatory to log AI data.");
      return;
    }
    
    // Deterministic Checks
    if (currentScanDocType === "po") {
      let documentTotal = Number(extractedData.totalAmount?.value) || 0;
      let calculatedTotal = 0;
      const items = extractedData.items || [];
      
      for (const item of items) {
        const qty = Number(item.quantityOrdered?.value) || 0;
        const price = Number(item.unitPrice?.value) || 0;
        const lineTotal = Number(item.lineTotal?.value) || 0;
        
        if (qty * price > 0 && Math.abs(qty * price - lineTotal) > 0.05) {
          setScanError(`Line item "${item.itemDescription?.value}" has a math error: ${qty} * ${price} != ${lineTotal}`);
          return;
        }
        calculatedTotal += lineTotal;
      }
      
      if (documentTotal > 0 && Math.abs(documentTotal - calculatedTotal) > 0.05) {
         setScanError(`Document total math error: Sum of lines (${calculatedTotal.toFixed(2)}) != Document Total (${documentTotal.toFixed(2)})`);
         return;
      }
    } else {
      // GRN Checks
      if (!extractedData.poNumber?.value) {
        setScanError("GRN must have an associated PO Number reference.");
        return;
      }
      const items = extractedData.items || [];
      for (const item of items) {
        if (!item.itemDescription?.value) {
          setScanError("All GRN items must have a description.");
          return;
        }
      }
    }

    const timestamp = getFormattedTimestamp();

    if (currentScanDocType === "po") {
      const items = extractedData.items || [];
      const newPOEntries: POLine[] = items.map((item: any, idx: number) => ({
        id: `PO-AI-${extractedData.poNumber?.value || ""}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        poNumber: String(extractedData.poNumber?.value || ""),
        poDate: formatDate(extractedData.poDate?.value),
        buyer: String(extractedData.buyer?.value || ""),
        supplier: String(extractedData.supplier?.value || ""),
        supplierAddress: String(extractedData.supplierAddress?.value || ""),
        currency: String(extractedData.currency?.value || ""),
        deliveryLocation: String(extractedData.deliveryLocation?.value || ""),
        paymentTerms: String(extractedData.paymentTerms?.value || ""),
        lineNumber: String(item.lineNumber?.value || ""),
        itemDescription: String(item.itemDescription?.value || ""),
        quantityOrdered: (item.quantityOrdered?.value !== undefined && item.quantityOrdered?.value !== "") ? Number(item.quantityOrdered?.value) : ("" as any),
        unitPrice: (item.unitPrice?.value !== undefined && item.unitPrice?.value !== "") ? Number(item.unitPrice?.value) : ("" as any),
        totalAmount: ((item.lineTotal?.value || item.totalAmount?.value) !== undefined && (item.lineTotal?.value || item.totalAmount?.value) !== "") ? Number(item.lineTotal?.value || item.totalAmount?.value) : ("" as any),
        expectedDelivery: formatDate(extractedData.expectedDelivery?.value),
        sourceFileName: uploadedFile?.name || "Scanned PO",
        sourceFileSize: uploadedFile?.size || 0,
        sourceWorkbookName: uploadedFile?.name || "Scanned PO",
        sourceType: "extracted",
        dateParserVersion: "v2-date-only",
        extractionQuality: {
          poNumber: extractedData.poNumber?.status || "clear",
          poDate: extractedData.poDate?.status || "clear",
          buyer: extractedData.buyer?.status || "clear",
          supplier: extractedData.supplier?.status || "clear",
          supplierAddress: extractedData.supplierAddress?.status || "clear",
          currency: extractedData.currency?.status || "clear",
          deliveryLocation: extractedData.deliveryLocation?.status || "clear",
          paymentTerms: extractedData.paymentTerms?.status || "clear",
          lineNumber: item.lineNumber?.status || "clear",
          itemDescription: item.itemDescription?.status || "clear",
          quantityOrdered: item.quantityOrdered?.status || "clear",
          unitPrice: item.unitPrice?.status || "clear",
          totalAmount: item.lineTotal?.status || item.totalAmount?.status || "clear",
          expectedDelivery: extractedData.expectedDelivery?.status || "clear",
        },
        originalValues: {
          poNumber: extractedData.poNumber?.originalText || extractedData.poNumber?.value,
          poDate: extractedData.poDate?.originalText || extractedData.poDate?.value,
          supplier: extractedData.supplier?.originalText || extractedData.supplier?.value,
          itemDescription: item.itemDescription?.originalText || item.itemDescription?.value,
          quantityOrdered: item.quantityOrdered?.originalText || item.quantityOrdered?.value,
          unitPrice: item.unitPrice?.originalText || item.unitPrice?.value,
          totalAmount: item.lineTotal?.originalText || item.lineTotal?.value || item.totalAmount?.originalText || item.totalAmount?.value,
          expectedDelivery: extractedData.expectedDelivery?.originalText || extractedData.expectedDelivery?.value
        },
        verifiedRecord: {
          reviewerName,
          verifiedAt: `${timestamp} - Notes: ${verificationNotes || "None"}`
        }
      }));

      setLocalPOs(prev => [...prev, ...newPOEntries]);
    } else {
      // GRN
      const items = extractedData.items || [];
      const newGRNEntries: GRNLine[] = items.map((item: any, idx: number) => ({
        id: `GRN-AI-${extractedData.grnNumber?.value || ""}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        grnNumber: String(extractedData.grnNumber?.value || ""),
        grnDate: formatDate(extractedData.grnDate?.value),
        poNumber: String(extractedData.poNumber?.value || ""),
        supplier: String(extractedData.supplier?.value || ""),
        warehouse: String(extractedData.warehouse?.value || ""),
        signaturePresent: Boolean(extractedData.signaturePresent?.value),
        remarks: String(extractedData.remarks?.value || ""),
        itemDescription: String(item.itemDescription?.value || ""),
        quantityOrdered: (item.quantityOrdered?.value !== undefined && item.quantityOrdered?.value !== "") ? Number(item.quantityOrdered?.value) : ("" as any),
        quantityReceived: (item.quantityReceived?.value !== undefined && item.quantityReceived?.value !== "") ? Number(item.quantityReceived?.value) : ("" as any),
        condition: String(item.condition?.value || ""),
        receivedBy: String(extractedData.receivedBy?.value || ""),
        sourceFileName: uploadedFile?.name || "Scanned GRN",
        sourceFileSize: uploadedFile?.size || 0,
        sourceWorkbookName: uploadedFile?.name || "Scanned GRN",
        sourceType: "extracted",
        dateParserVersion: "v2-date-only",
        extractionQuality: {
          grnNumber: extractedData.grnNumber?.status || "clear",
          grnDate: extractedData.grnDate?.status || "clear",
          poNumber: extractedData.poNumber?.status || "clear",
          supplier: extractedData.supplier?.status || "clear",
          warehouse: extractedData.warehouse?.status || "clear",
          signaturePresent: extractedData.signaturePresent?.status || "clear",
          remarks: extractedData.remarks?.status || "clear",
          itemDescription: item.itemDescription?.status || "clear",
          quantityOrdered: item.quantityOrdered?.status || "clear",
          quantityReceived: item.quantityReceived?.status || "clear",
          condition: item.condition?.status || "clear",
          receivedBy: extractedData.receivedBy?.status || "clear",
        },
        originalValues: {
          grnNumber: extractedData.grnNumber?.originalText || extractedData.grnNumber?.value,
          grnDate: extractedData.grnDate?.originalText || extractedData.grnDate?.value,
          poNumber: extractedData.poNumber?.originalText || extractedData.poNumber?.value,
          supplier: extractedData.supplier?.originalText || extractedData.supplier?.value,
          itemDescription: item.itemDescription?.originalText || item.itemDescription?.value,
          quantityReceived: item.quantityReceived?.originalText || item.quantityReceived?.value,
          condition: item.condition?.originalText || item.condition?.value,
          receivedBy: extractedData.receivedBy?.originalText || extractedData.receivedBy?.value
        },
        verifiedRecord: {
          reviewerName,
          verifiedAt: `${timestamp} - Notes: ${verificationNotes || "None"}`
        }
      }));

      setLocalGRNs(prev => [...prev, ...newGRNEntries]);
    }

    // Remove current scan from pending queue
    setPendingScans(prev => {
      const updated = [...prev];
      updated.splice(currentScanIndex, 1);
      return updated;
    });
    // Adjust index if out of bounds
    if (currentScanIndex > 0 && currentScanIndex >= pendingScans.length - 1) {
      setCurrentScanIndex(Math.max(0, pendingScans.length - 2));
    }
    
    setVerificationNotes("");
  };

  // Delete handlers
  const deletePO = (id: string) => {
    setLocalPOs(prev => prev.filter(p => p.id !== id));
  };

  const deleteGRN = (id: string) => {
    setLocalGRNs(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div id="step-2-container" className="space-y-6">
      {/* Input Method Navigation Toggle */}
      <div className="flex border border-gray-100 bg-white rounded-xl p-1 shadow-2xs max-w-md">
        <button
          onClick={() => setInputMethod("excel")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition ${
            inputMethod === "excel" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Upload PO & GRN Excel</span>
        </button>
        <button
          onClick={() => setInputMethod("ai_scan")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition ${
            inputMethod === "ai_scan" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Scan Printed/Handwritten (AI)</span>
        </button>
      </div>

      {/* METHOD 1: EXCEL PANEL */}
      {inputMethod === "excel" && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Method 1: PO & GRN Excel Upload</h3>
          <p className="text-xs text-gray-500 mb-5">
            Provide PO and GRN registers in an Excel sheet. The workbook can contain two worksheets (e.g., "Purchase Orders" and "Goods Received Notes"). Columns are mapped automatically.
          </p>

          <div
            onClick={() => excelInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl p-8 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-gray-900">Upload PO & GRN Workbook</h4>
            <p className="text-[10px] text-gray-400 mt-1">Accepts multiple sheets containing PO lines and receipt lists</p>
          </div>

          {/* Sandbox Template */}
          <div className="mt-5 border-t border-gray-100 pt-5 flex items-center justify-between bg-amber-50/60 border border-amber-100/80 rounded-xl p-4">
            <div className="flex items-start space-x-3 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Sandbox Test Sheet Ready</p>
                <p className="text-amber-700 mt-0.5 text-[11px]">Generate a PO and GRN workbook containing multi-receipts, partial matches, and damaged notes.</p>
              </div>
            </div>
            <button
              onClick={downloadSamplePOGRNData}
              className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-100 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get Sample PO & GRN</span>
            </button>
          </div>

          {showMappingReview && pendingExcelData && (
            <div className="mt-5 bg-white border border-indigo-100 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Stage-Level Mapping Confirmation</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Found {pendingExcelData.newPOs.length} POs and {pendingExcelData.newGRNs.length} GRNs in {pendingExcelData.file.name}. Please confirm the extraction.
                  </p>
                </div>
                {pendingExcelData.isDuplicate && (
                   <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Duplicate File</span>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase mb-2 border-b pb-1">PO Mappings</h5>
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded border border-gray-100 text-[10px] font-semibold text-gray-500">
                      <div>Required Field</div>
                      <div>Mapped Header</div>
                      <div>Sample Value</div>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 mt-1">
                      {pendingExcelData.poMappings?.map((m: any, i: number) => (
                        <div key={i} className="grid grid-cols-3 gap-2 px-2 py-1 border-b border-gray-50 text-[11px] items-center">
                          <div className="font-medium text-gray-900">{m.field}</div>
                          <div>
                            <span className={m.mappedTo === "Unmapped" ? "bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-mono" : "bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono"}>
                              {m.mappedTo}
                            </span>
                          </div>
                          <div className="text-gray-500 truncate">{m.sample || "N/A"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase mb-2 border-b pb-1">GRN Mappings</h5>
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded border border-gray-100 text-[10px] font-semibold text-gray-500">
                      <div>Required Field</div>
                      <div>Mapped Header</div>
                      <div>Sample Value</div>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 mt-1">
                      {pendingExcelData.grnMappings?.map((m: any, i: number) => (
                        <div key={i} className="grid grid-cols-3 gap-2 px-2 py-1 border-b border-gray-50 text-[11px] items-center">
                          <div className="font-medium text-gray-900">{m.field}</div>
                          <div>
                            <span className={m.mappedTo === "Unmapped" ? "bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-mono" : "bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono"}>
                              {m.mappedTo}
                            </span>
                          </div>
                          <div className="text-gray-500 truncate">{m.sample || "N/A"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/30 border border-indigo-100 p-3 rounded-lg space-y-3 mt-4">
                  <h5 className="text-[11px] font-bold text-indigo-900 uppercase">Mandatory Auditor Sign-Off</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-1">Reviewer Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full border border-indigo-200 focus:outline-none focus:border-indigo-500 bg-white px-2 py-1.5 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-700 mb-1">Decision / Notes</label>
                      <input
                        type="text"
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        placeholder="e.g. Mappings confirmed, proceeding"
                        className="w-full border border-indigo-200 focus:outline-none focus:border-indigo-500 bg-white px-2 py-1.5 rounded text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {pendingExcelData.isDuplicate && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs mt-4">
                    <strong>Duplicate Upload Detected:</strong> You have already uploaded data from this file. You can replace the existing data or keep both.
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                   <button
                     onClick={() => {
                        setShowMappingReview(false);
                        setPendingExcelData(null);
                     }}
                     className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                   >
                     Cancel
                   </button>
                   <div className="space-x-2">
                     {pendingExcelData.isDuplicate ? (
                       <>
                         <button
                           onClick={() => confirmExcelImport(false)}
                           className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200"
                         >
                           Keep Existing & Append
                         </button>
                         <button
                           onClick={() => confirmExcelImport(true)}
                           className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                         >
                           Replace and Reprocess
                         </button>
                       </>
                     ) : (
                       <button
                           onClick={() => confirmExcelImport(false)}
                           className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center space-x-2"
                         >
                           <CheckCircle2 className="h-4 w-4" />
                           <span>Confirm Mapping & Import Data</span>
                       </button>
                     )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {excelSuccess && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{excelSuccess}</span>
            </div>
          )}

          {excelError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>{excelError}</span>
            </div>
          )}
        </div>
      )}

      {/* METHOD 2: AI SCAN PANEL */}
      {inputMethod === "ai_scan" && pendingScans.length === 0 && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-semibold text-gray-900">Method 2: Scan Printed POs & Handwritten GRNs</h3>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">AI Service Status:</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                (aiStatus === "Connected" || aiStatus === "Ready" || aiStatus === "Success") ? "bg-emerald-50 text-emerald-600" :
                (aiStatus === "Checking..." || aiStatus === "Extracting...") ? "bg-blue-50 text-blue-600" :
                "bg-rose-50 text-rose-600"
              }`}>
                {aiStatus}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Upload PDF scans of printed POs or photos of handwritten delivery checklists. The in-app AP assistant will extract core numbers, quantities, condition statuses, and signatures.
            {aiErrorMsg && <span className="block mt-1 text-rose-600">Diagnostics: {aiErrorMsg}</span>}
          </p>

          <div className="flex items-center space-x-4 mb-4">
            <div className="text-xs font-semibold text-gray-700">Document Type of Scan:</div>
            <label className="inline-flex items-center text-xs space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={scanDocType === "po"}
                onChange={() => setScanDocType("po")}
                className="text-indigo-600"
              />
              <span>Purchase Order (PO)</span>
            </label>
            <label className="inline-flex items-center text-xs space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={scanDocType === "grn"}
                onChange={() => setScanDocType("grn")}
                className="text-indigo-600"
              />
              <span>Goods Received Note (GRN)</span>
            </label>
          </div>

          <div
            onClick={() => scanInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer`}
          >
            <input
              type="file"
              ref={scanInputRef}
              onChange={handleDocScanUpload}
              accept="image/*, application/pdf"
              className="hidden"
              multiple
            />
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-gray-900">Analyse Document Image or PDF</h4>
            <p className="text-[10px] text-gray-400 mt-1">Accepts JPG, PNG, PDF formats. Recommended for printed or handwritten checklists</p>
          </div>

          {scanLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-gray-600">AP Assistant is auditing handwriting, signatures, and stamps...</p>
            </div>
          )}

          {scanError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}
        </div>
      )}

      {/* AI REVIEW SCREEN - SIDE BY SIDE PREVIEW & VERIFICATION FORM */}
      {pendingScans.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {pendingScans.length > 1 && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
              <span className="text-sm font-semibold text-indigo-900">
                Verifying document {currentScanIndex + 1} of {pendingScans.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentScanIndex(Math.max(0, currentScanIndex - 1))}
                  disabled={currentScanIndex === 0}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-indigo-200 rounded text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentScanIndex(Math.min(pendingScans.length - 1, currentScanIndex + 1))}
                  disabled={currentScanIndex === pendingScans.length - 1}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-indigo-200 rounded text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left panel: Document Image/PDF Viewer */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Document Source Attachment View</h4>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{uploadedFile?.size}</span>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-gray-100 relative">
              {uploadedFile?.type.includes("pdf") ? (
                <iframe
                  src={uploadedFile.dataUrl}
                  title="PDF Document Viewer"
                  className="w-full h-full border-0 rounded"
                />
              ) : (
                <img
                  src={uploadedFile?.dataUrl}
                  referrerPolicy="no-referrer"
                  alt="Extracted Document Source"
                  className="max-h-full max-w-full object-contain shadow-xs rounded"
                />
              )}
            </div>
          </div>

          {/* Right panel: Extracted Data Audit Form */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex flex-col h-[600px] overflow-y-auto">
            {currentScan?.error && (
               <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-medium flex items-start space-x-2">
                 <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                 <span>{currentScan.error}</span>
               </div>
            )}
            {currentScan?.status !== "success" && (
              <button
                onClick={() => handleAnalyseDocument(currentScanIndex)}
                disabled={isQuotaExceeded || scanLoading}
                className={`shrink-0 mb-4 px-4 py-2 rounded-lg text-sm font-semibold text-white transition flex justify-center ${
                  isQuotaExceeded || scanLoading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {scanLoading ? "Analysing..." : "Analyse Document"}
              </button>
            )}
              <>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-gray-900">
                {currentScan?.status === "success" ? `Extracted ${scanDocType.toUpperCase()} Fields & Correction Form` : `Manual Entry Form`}
              </h4>
              <div className="flex flex-col items-end">
                {currentScan?.status === "success" && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase">AI Draft</span>}
              </div>
            </div>
            
            {currentScan?.diagnostics && currentScan?.status === "success" && (
              <div className="mb-4 text-xs">
                <button 
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="text-gray-500 hover:text-gray-700 font-semibold flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Technical Details</span>
                </button>
                {showTechnicalDetails && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[9px] text-gray-600">
                    <div>MIME: {currentScan.diagnostics.mimeType} | Model: {currentScan.diagnostics.model}</div>
                    <div>Validation: {currentScan.diagnostics.validation}</div>
                    <div className="mt-1 font-mono break-all">{JSON.stringify(currentScan.extractedData)}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 space-y-4 pr-1">
              {/* Top level fields */}
              {extractedData && (scanDocType === "po" ? (
                <>
                  {renderExtractedField("PO Number", "poNumber", extractedData.poNumber?.value, extractedData.poNumber?.status, handleExtractedFieldChange, extractedData.poNumber?.originalText, extractedData.poNumber?.note)}
                  {renderExtractedField("PO Date (YYYY-MM-DD)", "poDate", extractedData.poDate?.value, extractedData.poDate?.status, handleExtractedFieldChange, extractedData.poDate?.originalText, extractedData.poDate?.note)}
                  {renderExtractedField("Buyer", "buyer", extractedData.buyer?.value, extractedData.buyer?.status, handleExtractedFieldChange, extractedData.buyer?.originalText, extractedData.buyer?.note)}
                  {renderExtractedField("Supplier", "supplier", extractedData.supplier?.value, extractedData.supplier?.status, handleExtractedFieldChange, extractedData.supplier?.originalText, extractedData.supplier?.note)}
                  {renderExtractedField("Supplier Address", "supplierAddress", extractedData.supplierAddress?.value, extractedData.supplierAddress?.status, handleExtractedFieldChange, extractedData.supplierAddress?.originalText, extractedData.supplierAddress?.note)}
                  {renderExtractedField("Currency", "currency", extractedData.currency?.value, extractedData.currency?.status, handleExtractedFieldChange, extractedData.currency?.originalText, extractedData.currency?.note)}
                  {renderExtractedField("Delivery Location", "deliveryLocation", extractedData.deliveryLocation?.value, extractedData.deliveryLocation?.status, handleExtractedFieldChange, extractedData.deliveryLocation?.originalText, extractedData.deliveryLocation?.note)}
                  {renderExtractedField("Payment Terms", "paymentTerms", extractedData.paymentTerms?.value, extractedData.paymentTerms?.status, handleExtractedFieldChange, extractedData.paymentTerms?.originalText, extractedData.paymentTerms?.note)}
                  {renderExtractedField("Expected Delivery", "expectedDelivery", extractedData.expectedDelivery?.value, extractedData.expectedDelivery?.status, handleExtractedFieldChange, extractedData.expectedDelivery?.originalText, extractedData.expectedDelivery?.note)}
                  {renderExtractedField("Total Amount", "totalAmount", extractedData.totalAmount?.value, extractedData.totalAmount?.status, handleExtractedFieldChange, extractedData.totalAmount?.originalText, extractedData.totalAmount?.note)}
                </>
              ) : (
                <>
                  {renderExtractedField("GRN Number", "grnNumber", extractedData.grnNumber?.value, extractedData.grnNumber?.status, handleExtractedFieldChange, extractedData.grnNumber?.originalText, extractedData.grnNumber?.note)}
                  {renderExtractedField("GRN Date (YYYY-MM-DD)", "grnDate", extractedData.grnDate?.value, extractedData.grnDate?.status, handleExtractedFieldChange, extractedData.grnDate?.originalText, extractedData.grnDate?.note)}
                  {renderExtractedField("PO Number Ref", "poNumber", extractedData.poNumber?.value, extractedData.poNumber?.status, handleExtractedFieldChange, extractedData.poNumber?.originalText, extractedData.poNumber?.note)}
                  {renderExtractedField("Supplier", "supplier", extractedData.supplier?.value, extractedData.supplier?.status, handleExtractedFieldChange, extractedData.supplier?.originalText, extractedData.supplier?.note)}
                  {renderExtractedField("Warehouse", "warehouse", extractedData.warehouse?.value, extractedData.warehouse?.status, handleExtractedFieldChange, extractedData.warehouse?.originalText, extractedData.warehouse?.note)}
                  {renderExtractedField("Received By", "receivedBy", extractedData.receivedBy?.value, extractedData.receivedBy?.status, handleExtractedFieldChange, extractedData.receivedBy?.originalText, extractedData.receivedBy?.note)}
                  {renderExtractedField("Signature Present (true/false)", "signaturePresent", extractedData.signaturePresent?.value, extractedData.signaturePresent?.status, handleExtractedFieldChange, extractedData.signaturePresent?.originalText, extractedData.signaturePresent?.note)}
                  {renderExtractedField("Remarks", "remarks", extractedData.remarks?.value, extractedData.remarks?.status, handleExtractedFieldChange, extractedData.remarks?.originalText, extractedData.remarks?.note)}
                </>
              ))}

              {/* Items Table */}
              {extractedData && <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <h5 className="text-xs font-semibold text-gray-800 mb-2">Line Items Extracted</h5>
                {(extractedData.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="border-b border-gray-100 last:border-b-0 py-3 space-y-2">
                    <div className="text-[10px] font-bold text-gray-400">LINE ITEM #{idx+1}</div>
                    {renderExtractedField(
                      "Description",
                      "itemDescription",
                      item.itemDescription?.value,
                      item.itemDescription?.status,
                      (k, v) => handleExtractedFieldChange(k, v, idx, "itemDescription"),
                      item.itemDescription?.originalText,
                      item.itemDescription?.note
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      {scanDocType === "po" ? (
                        <>
                          {renderExtractedField(
                            "Quantity Ordered",
                            "quantityOrdered",
                            item.quantityOrdered?.value,
                            item.quantityOrdered?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "quantityOrdered"),
                            item.quantityOrdered?.originalText,
                            item.quantityOrdered?.note
                          )}
                          {renderExtractedField(
                            "Unit Price",
                            "unitPrice",
                            item.unitPrice?.value,
                            item.unitPrice?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "unitPrice"),
                            item.unitPrice?.originalText,
                            item.unitPrice?.note
                          )}
                          {renderExtractedField(
                            "Line Total",
                            "lineTotal",
                            item.lineTotal?.value || item.totalAmount?.value,
                            item.lineTotal?.status || item.totalAmount?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "lineTotal"),
                            item.lineTotal?.originalText || item.totalAmount?.originalText,
                            item.lineTotal?.note || item.totalAmount?.note
                          )}
                        </>
                      ) : (
                        <>
                          {renderExtractedField(
                            "Quantity Ordered",
                            "quantityOrdered",
                            item.quantityOrdered?.value,
                            item.quantityOrdered?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "quantityOrdered"),
                            item.quantityOrdered?.originalText,
                            item.quantityOrdered?.note
                          )}
                          {renderExtractedField(
                            "Quantity Received",
                            "quantityReceived",
                            item.quantityReceived?.value,
                            item.quantityReceived?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "quantityReceived"),
                            item.quantityReceived?.originalText,
                            item.quantityReceived?.note
                          )}
                          {renderExtractedField(
                            "Condition",
                            "condition",
                            item.condition?.value,
                            item.condition?.status,
                            (k, v) => handleExtractedFieldChange(k, v, idx, "condition"),
                            item.condition?.originalText,
                            item.condition?.note
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>}

              {/* Mandatory internal review section */}
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-lg p-4 space-y-3 mt-6">
                <h5 className="text-xs font-bold text-indigo-900 flex items-center space-x-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Internal Control: Human Review & Audit Record</span>
                </h5>
                <p className="text-[10px] text-gray-500">
                  Every scanned document containing uncertain values or corrections must be logged with the verifying officer's signature.
                </p>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 mb-1">Verify Reviewer Name *</label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Enter your full name (Verifying Officer)"
                    className="w-full border border-indigo-200 focus:outline-none focus:border-indigo-500 bg-white px-3 py-1.5 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-700 mb-1">Audit Log Notes</label>
                  <textarea
                    rows={2}
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Provide comments regarding handwriting legibility, condition checks, or details corrected."
                    className="w-full border border-indigo-200 focus:outline-none focus:border-indigo-500 bg-white px-3 py-1.5 rounded text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Verification buttons */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4 shrink-0">
              <button
                onClick={() => {
                  setPendingScans(prev => {
                    const updated = [...prev];
                    updated.splice(currentScanIndex, 1);
                    return updated;
                  });
                  if (currentScanIndex > 0 && currentScanIndex >= pendingScans.length - 1) {
                    setCurrentScanIndex(Math.max(0, pendingScans.length - 2));
                  }
                }}
                className="text-xs text-gray-500 hover:text-gray-900 bg-white px-3 py-2 rounded border border-gray-200 font-medium transition"
              >
                Discard Scan
              </button>
              <button
                onClick={handleVerifyExtractedDoc}
                className="flex items-center space-x-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
              >
                <UserCheck className="h-4 w-4" />
                <span>Verify & Commit Document</span>
              </button>
            </div>
            </>
          </div>
          </div>
        </motion.div>
      )}

      {/* DETAILED LEDGER OF CURRENTLY ACTIVE DATA (PO AND GRN OVERVIEW) */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
        <div className="mb-4 flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">
                Active File(s): {Array.from(new Set([...localPOs.map(p => p.sourceFileName), ...localGRNs.map(g => g.sourceFileName)])).filter(n => n !== "Manual Entry" && n).join(", ") || "Manual Entry"}
              </p>
              <p className="text-[10px] text-gray-500">{localPOs.length} PO lines, {localGRNs.length} GRN lines loaded</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
          <div>
            <h4 className="text-md font-semibold text-gray-900">PO & GRN Matching Pool Ledger</h4>
            <p className="text-xs text-gray-500 mt-1">This pool shows currently loaded supporting documents available for matching.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowManualPOForm(!showManualPOForm);
                setShowManualGRNForm(false);
              }}
              className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add PO Manually</span>
            </button>
            <button
              onClick={() => {
                setShowManualGRNForm(!showManualGRNForm);
                setShowManualPOForm(false);
              }}
              className="flex items-center space-x-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add GRN Manually</span>
            </button>
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
              {localPOs.length} PO lines • {localGRNs.length} GRN lines
            </span>
          </div>
        </div>

        {/* COLLAPSIBLE MANUAL PO FORM */}
        {showManualPOForm && (
          <div className="bg-indigo-50/40 p-4 rounded-lg border border-indigo-100 mb-4 text-xs">
            <h5 className="font-bold text-indigo-900 mb-3 flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add New Purchase Order (PO) Line</span>
            </h5>
            <form onSubmit={handleManualPOSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">PO Number *</label>
                <input
                  type="text" required value={mPoNo} onChange={(e) => setMPoNo(e.target.value)}
                  placeholder="e.g. PO-8871"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supplier Name *</label>
                <input
                  type="text" required value={mPoSupplier} onChange={(e) => setMPoSupplier(e.target.value)}
                  placeholder="e.g. Wayne Industries"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">PO Date</label>
                <input
                  type="date" value={mPoDate} onChange={(e) => setMPoDate(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expected Delivery</label>
                <input
                  type="date" value={mPoDelivery} onChange={(e) => setMPoDelivery(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Item Description *</label>
                <input
                  type="text" required value={mPoItemDesc} onChange={(e) => setMPoItemDesc(e.target.value)}
                  placeholder="e.g. Heavy Duty Steel Bolts M12"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qty Ordered *</label>
                <input
                  type="number" required min={1} value={mPoQty} onChange={(e) => setMPoQty(e.target.value !== "" ? parseInt(e.target.value) : "")}
                  placeholder="e.g. 100"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit Price ($) *</label>
                <input
                  type="number" required step="0.01" min={0} value={mPoPrice} onChange={(e) => setMPoPrice(e.target.value !== "" ? parseFloat(e.target.value) : "")}
                  placeholder="e.g. 14.50"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-4 flex justify-end space-x-2">
                <button
                  type="button" onClick={() => setShowManualPOForm(false)}
                  className="text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 rounded cursor-pointer animate-pulse"
                >
                  Save PO Line
                </button>
              </div>
            </form>
          </div>
        )}

        {/* COLLAPSIBLE MANUAL GRN FORM */}
        {showManualGRNForm && (
          <div className="bg-teal-50/40 p-4 rounded-lg border border-teal-100 mb-4 text-xs">
            <h5 className="font-bold text-teal-900 mb-3 flex items-center space-x-1">
              <Plus className="h-4 w-4" />
              <span>Add New Goods Received Note (GRN) Line</span>
            </h5>
            <form onSubmit={handleManualGRNSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GRN Number *</label>
                <input
                  type="text" required value={mGrnNo} onChange={(e) => setMGrnNo(e.target.value)}
                  placeholder="e.g. GRN-998A"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Associated PO Number *</label>
                <input
                  type="text" required value={mGrnPoNo} onChange={(e) => setMGrnPoNo(e.target.value)}
                  placeholder="e.g. PO-8871"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supplier Name</label>
                <input
                  type="text" value={mGrnSupplier} onChange={(e) => setMGrnSupplier(e.target.value)}
                  placeholder="e.g. Wayne Industries"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GRN Date</label>
                <input
                  type="date" value={mGrnDate} onChange={(e) => setMGrnDate(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Item Description *</label>
                <input
                  type="text" required value={mGrnItemDesc} onChange={(e) => setMGrnItemDesc(e.target.value)}
                  placeholder="e.g. Heavy Duty Steel Bolts M12"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qty Received *</label>
                <input
                  type="number" required min={1} value={mGrnQty} onChange={(e) => setMGrnQty(e.target.value !== "" ? parseInt(e.target.value) : "")}
                  placeholder="e.g. 100"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Condition</label>
                <select
                  value={mGrnCond} onChange={(e) => setMGrnCond(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Good">Good</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Poor">Poor</option>
                  <option value="Acceptable">Acceptable</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Received By</label>
                <input
                  type="text" value={mGrnRecvBy} onChange={(e) => setMGrnRecvBy(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full border border-gray-200 bg-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="md:col-span-4 flex justify-end space-x-2">
                <button
                  type="button" onClick={() => setShowManualGRNForm(false)}
                  className="text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-1.5 rounded cursor-pointer"
                >
                  Save GRN Line
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* PO Ledger */}
          <div className="border border-gray-100 rounded-lg p-4">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Loaded Purchase Orders</h5>
            {localPOs.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">No Purchase Orders loaded yet.</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                {localPOs.map((po) => (
                  <div key={po.id} className="flex items-center justify-between border border-gray-100 bg-gray-50/50 p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">PO #{po.poNumber}</span>
                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded">{po.supplier}</span>
                        {po.sourceType === "extracted" && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1 rounded flex items-center">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 mt-1">{po.itemDescription}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Qty Ordered: {po.quantityOrdered} • Price: ${po.unitPrice.toFixed(2)} • File: {po.sourceFileName}
                      </div>
                    </div>
                    <button
                      onClick={() => deletePO(po.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GRN Ledger */}
          <div className="border border-gray-100 rounded-lg p-4">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Loaded Goods Received Notes</h5>
            {localGRNs.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">No Goods Received Notes loaded yet.</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                {localGRNs.map((grn) => (
                  <div key={grn.id} className="flex items-center justify-between border border-gray-100 bg-gray-50/50 p-2.5 rounded-lg text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">GRN #{grn.grnNumber}</span>
                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded">PO Ref: #{grn.poNumber}</span>
                        {grn.sourceType === "extracted" && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1 rounded">AI</span>
                        )}
                      </div>
                      <div className="text-gray-500 mt-1">{grn.itemDescription}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex flex-wrap gap-1.5 items-center">
                        <span>Qty Recv: {grn.quantityReceived}</span>
                        <span>• Condition:</span>
                        <span className={`font-semibold ${normalizeText(grn.condition) === "good" ? "text-emerald-600" : "text-amber-600"}`}>
                          {grn.condition}
                        </span>
                        <span>• By: {grn.receivedBy || "N/A"}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGRN(grn.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Progress Action Buttons */}
        <div className="flex justify-between items-center border-t border-gray-100 pt-6 mt-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg font-medium transition"
            >
              Back to Step 1
            </button>
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 px-4 py-2 rounded-lg font-medium transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete All</span>
            </button>
          </div>
          <button
            onClick={() => onDataConfirmed(localPOs, localGRNs)}
            disabled={localPOs.length === 0 && localGRNs.length === 0}
            className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition"
          >
            <span>Proceed to Three-Way Match</span>
            <ArrowRight className="h-4 w-4" />
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
                <h3 className="text-lg font-bold text-gray-900">Delete All POs & GRNs</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete all PO and GRN data? This action cannot be undone.
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
                  setLocalPOs([]);
                  setLocalGRNs([]);
                  setShowDeleteAllConfirm(false);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Extracted Field Form Row Helper Component
// ----------------------------------------------------------------------
function renderExtractedField(
  label: string,
  fieldKey: string,
  value: any,
  status: ExtractedFieldStatus,
  onChange: (key: string, val: any) => void,
  originalText?: string,
  note?: string
) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <label className="font-semibold text-gray-600">{label}</label>
        <span className={`px-1.5 py-0.5 rounded font-semibold uppercase ${
          status === "clear" ? "bg-green-100 text-green-700" :
          status === "human corrected" ? "bg-blue-100 text-blue-700" :
          status === "missing" ? "bg-gray-100 text-gray-700" :
          "bg-yellow-100 text-yellow-700"
        }`}>
          {status}
        </span>
      </div>
      <input
        type="text"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={`w-full text-sm p-2 border rounded-md focus:ring-1 focus:outline-none transition ${
          status === "uncertain" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50/30" :
          status === "missing" ? "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/50" :
          status === "human corrected" ? "border-blue-300 focus:border-blue-500 focus:ring-blue-500" :
          "border-gray-200 focus:border-green-500 focus:ring-green-500"
        }`}
      />
      {(originalText || note) && (
        <div className="text-[10px] text-gray-500 flex flex-col">
          {originalText && <span className="truncate">Original: <span className="font-mono">{originalText}</span></span>}
          {note && <span className="text-yellow-700 truncate">{note}</span>}
        </div>
      )}
    </div>
  );
}

function normalizeText(text: string): string {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}
