/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DateStandardisationRecord, InvoiceLine, POLine, GRNLine, ColumnMapping } from "../types";

/**
 * Check if a year is a leap year.
 */
export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

/**
 * Helper to get the number of days in a given month of a year.
 */
export function getDaysInMonth(y: number, m: number): number {
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m === 2 && isLeapYear(y)) {
    return 29;
  }
  return daysInMonth[m] || 0;
}

/**
 * Validates whether year, month, and day represent a valid calendar date.
 */
export function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1000 || y > 9999) return false;
  return d <= getDaysInMonth(y, m);
}

/**
 * Decodes numeric Excel date serial number to calendar year, month, and day components,
 * correctly supporting both the 1900 and 1904 date systems timezone-independently.
 */
export function decodeExcelSerial(serial: number, date1904?: boolean): { y: number; m: number; d: number } {
  let val = Math.round(serial);
  if (date1904) {
    val += 1462;
  }

  if (val === 60) {
    return { y: 1900, m: 2, d: 29 };
  } else if (val < 60) {
    // Before March 1, 1900, no leap year correction needed
  } else {
    val -= 1;
  }

  const baseDate = new Date(Date.UTC(1899, 11, 30));
  const targetDate = new Date(baseDate.getTime() + val * 24 * 60 * 60 * 1000);

  return {
    y: targetDate.getUTCFullYear(),
    m: targetDate.getUTCMonth() + 1,
    d: targetDate.getUTCDate()
  };
}

/**
 * Helper to zero-pad date components.
 */
export function padZero(val: number, length: number = 2): string {
  return String(val).padStart(length, "0");
}

/**
 * Formats calendar components to DD/MM/YYYY.
 */
export function _unused_formatToYYYYMMDD(y: number, m: number, d: number): string {
  return `${padZero(d)}/${padZero(m)}/${padZero(y, 4)}`;
}

/**
 * Formats calendar components to YYYY-MM-DD.
 */
export function formatToYYYYMMDD(y: number, m: number, d: number): string {
  return `${padZero(y, 4)}-${padZero(m)}-${padZero(d)}`;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9, sept: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Tries to parse a string value into calendar components if it matches standard patterns.
 */
export function analyzeSingleDateString(val: string): {
  isYearFirst?: { y: number; m: number; d: number };
  isMonthName?: { y: number; m: number; d: number };
  isDmyOrMdy?: {
    a: number; // component 1
    b: number; // component 2
    y: number; // year
  };
  unrecognised?: boolean;
} {
  let s = val.trim();
  if (!s) return { unrecognised: true };

  // Remove trailing time if present (e.g. "12/07/2023 11:30 PM", "2023-07-12 14:35:00")
  s = s.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i, "");
  if (s.includes("T")) {
    s = s.split("T")[0];
  }

  // 1. Check for YYYY-MM-DD, YYYY/MM/DD, or YYYY.MM.DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return { isYearFirst: { y, m, d } };
  }

  // 2. Check for Month-Name formats: "12 July 2023", "12-Jul-2023", "Jul 12, 2023"
  // E.g. "12 July 2023" or "12 Jul 2023"
  const m1 = s.match(/^(\d{1,2})[-/. ]+([A-Za-z]+)[-/. ]+(\d{4})$/);
  if (m1) {
    const d = parseInt(m1[1], 10);
    const monthStr = m1[2].toLowerCase();
    const y = parseInt(m1[3], 10);
    if (MONTH_MAP[monthStr]) {
      return { isMonthName: { y, m: MONTH_MAP[monthStr], d } };
    }
  }

  // E.g. "July 12 2023" or "Jul 12, 2023"
  const m2 = s.match(/^([A-Za-z]+)[-/. ]+(\d{1,2})[-/., ]+(\d{4})$/);
  if (m2) {
    const monthStr = m2[1].toLowerCase();
    const d = parseInt(m2[2], 10);
    const y = parseInt(m2[3], 10);
    if (MONTH_MAP[monthStr]) {
      return { isMonthName: { y, m: MONTH_MAP[monthStr], d } };
    }
  }

  // 3. Check for standard separators with year at the end:
  // e.g. "DD/MM/YYYY" or "MM/DD/YYYY"
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const a = parseInt(dmyMatch[1], 10);
    const b = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    return { isDmyOrMdy: { a, b, y } };
  }

  // short year version: e.g. "DD/MM/YY"
  const shortMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (shortMatch) {
    const a = parseInt(shortMatch[1], 10);
    const b = parseInt(shortMatch[2], 10);
    const shortY = parseInt(shortMatch[3], 10);
    const y = shortY >= 50 ? 1900 + shortY : 2000 + shortY;
    return { isDmyOrMdy: { a, b, y } };
  }

  return { unrecognised: true };
}

/**
 * Standardises a single value under a specific scheme choice ("day-first" or "month-first").
 */
export function standardiseSingleValue(
  val: any,
  scheme: "day-first" | "month-first" | "unknown",
  date1904?: boolean
): {
  status: "Automatically Standardised" | "Confirmation Required" | "Invalid Date";
  standardised: string; // DD/MM/YYYY
  alternative?: string; // DD/MM/YYYY
  detectedFormat: string;
  method: string;
  isAmbiguous: boolean;
} {
  if (val === undefined || val === null || val === "") {
    return {
      status: "Invalid Date",
      standardised: "",
      detectedFormat: "Blank",
      method: "Blank Field",
      isAmbiguous: false
    };
  }

  // 1. Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return {
        status: "Invalid Date",
        standardised: "INVALID",
        detectedFormat: "Invalid JS Date",
        method: "Excel Date Object",
        isAmbiguous: false
      };
    }
    const y = val.getUTCFullYear();
    const m = val.getUTCMonth() + 1;
    const d = val.getUTCDate();
    if (!isValidCalendarDate(y, m, d)) {
      return {
        status: "Invalid Date",
        standardised: "INVALID",
        detectedFormat: "Invalid Date Components",
        method: "Excel Date Object",
        isAmbiguous: false
      };
    }
    return {
      status: "Automatically Standardised",
      standardised: formatToYYYYMMDD(y, m, d),
      detectedFormat: "Date Object",
      method: "Excel Date Extraction",
      isAmbiguous: false
    };
  }

  // 2. Numeric Excel serial
  const numVal = Number(val);
  if (typeof val === "number" || (!isNaN(numVal) && String(val).trim() !== "" && !String(val).includes("-") && !String(val).includes("/") && !String(val).includes("."))) {
    if (numVal > 0 && numVal < 3000000) {
      const decoded = decodeExcelSerial(numVal, date1904);
      if (!isValidCalendarDate(decoded.y, decoded.m, decoded.d)) {
        return {
          status: "Invalid Date",
          standardised: "INVALID",
          detectedFormat: "Invalid Serial Date",
          method: `Excel Serial (${date1904 ? "1904" : "1900"} system)`,
          isAmbiguous: false
        };
      }
      return {
        status: "Automatically Standardised",
        standardised: formatToYYYYMMDD(decoded.y, decoded.m, decoded.d),
        detectedFormat: "Excel Serial Number",
        method: `Excel Serial Decoding (${date1904 ? "1904" : "1900"} system)`,
        isAmbiguous: false
      };
    }
    return {
      status: "Invalid Date",
      standardised: "INVALID",
      detectedFormat: "Unknown Numeric",
      method: "Raw Numeric Analysis",
      isAmbiguous: false
    };
  }

  // 3. String analysis
  const str = String(val).trim();
  const analysis = analyzeSingleDateString(str);

  if (analysis.unrecognised) {
    return {
      status: "Invalid Date",
      standardised: "INVALID",
      detectedFormat: "Unrecognised Format",
      method: "String Pattern Scrutiny",
      isAmbiguous: false
    };
  }

  if (analysis.isYearFirst) {
    const { y, m, d } = analysis.isYearFirst;
    if (!isValidCalendarDate(y, m, d)) {
      return {
        status: "Invalid Date",
        standardised: "INVALID",
        detectedFormat: "YYYY-MM-DD",
        method: "ISO standard check",
        isAmbiguous: false
      };
    }
    return {
      status: "Automatically Standardised",
      standardised: formatToYYYYMMDD(y, m, d),
      detectedFormat: "YYYY-MM-DD",
      method: "ISO standard check",
      isAmbiguous: false
    };
  }

  if (analysis.isMonthName) {
    const { y, m, d } = analysis.isMonthName;
    if (!isValidCalendarDate(y, m, d)) {
      return {
        status: "Invalid Date",
        standardised: "INVALID",
        detectedFormat: "Month Name format",
        method: "Text Month Recognition",
        isAmbiguous: false
      };
    }
    return {
      status: "Automatically Standardised",
      standardised: formatToYYYYMMDD(y, m, d),
      detectedFormat: "Month Name format",
      method: "Text Month Recognition",
      isAmbiguous: false
    };
  }

  if (analysis.isDmyOrMdy) {
    const { a, b, y } = analysis.isDmyOrMdy;

    // Check validity in both directions
    const validAsDmy = isValidCalendarDate(y, b, a); // day-first: d=a, m=b
    const validAsMdy = isValidCalendarDate(y, a, b); // month-first: m=a, d=b

    if (!validAsDmy && !validAsMdy) {
      return {
        status: "Invalid Date",
        standardised: "INVALID",
        detectedFormat: "Impossible Calendar Date",
        method: "Dual-interpretation dry-run",
        isAmbiguous: false
      };
    }

    // If components are equal, it's unambiguous anyway (e.g. 05/05/2023)
    if (a === b) {
      return {
        status: "Automatically Standardised",
        standardised: formatToYYYYMMDD(y, a, a),
        detectedFormat: "DD/MM/YYYY",
        method: "Identical day and month components",
        isAmbiguous: false
      };
    }

    // If only one is valid
    if (validAsDmy && !validAsMdy) {
      return {
        status: "Automatically Standardised",
        standardised: formatToYYYYMMDD(y, b, a),
        detectedFormat: "DD/MM/YYYY (Day-First)",
        method: "Component boundary limit (>12)",
        isAmbiguous: false
      };
    }
    if (!validAsDmy && validAsMdy) {
      return {
        status: "Automatically Standardised",
        standardised: formatToYYYYMMDD(y, a, b),
        detectedFormat: "MM/DD/YYYY (Month-First)",
        method: "Component boundary limit (>12)",
        isAmbiguous: false
      };
    }

    // Both are valid (A <= 12, B <= 12, A !== B) -> Truly ambiguous cell in isolation!
    const dmyRep = formatToYYYYMMDD(y, b, a);
    const mdyRep = formatToYYYYMMDD(y, a, b);

    if (scheme === "day-first") {
      return {
        status: "Automatically Standardised",
        standardised: dmyRep,
        alternative: mdyRep,
        detectedFormat: "DD/MM/YYYY (Day-First)",
        method: "Column-wise format propagation",
        isAmbiguous: false // Resolved by column choice
      };
    } else if (scheme === "month-first") {
      return {
        status: "Automatically Standardised",
        standardised: mdyRep,
        alternative: dmyRep,
        detectedFormat: "MM/DD/YYYY (Month-First)",
        method: "Column-wise format propagation",
        isAmbiguous: false // Resolved by column choice
      };
    } else {
      // Column scheme is unknown/ambiguous
      return {
        status: "Confirmation Required",
        standardised: dmyRep, // default suggested
        alternative: mdyRep,
        detectedFormat: "Ambiguous (DD/MM/YYYY vs MM/DD/YYYY)",
        method: "No unambiguous column-level evidence",
        isAmbiguous: true
      };
    }
  }

  return {
    status: "Invalid Date",
    standardised: "INVALID",
    detectedFormat: "Unknown Format",
    method: "Fallback Parsing",
    isAmbiguous: false
  };
}

/**
 * Executes a column-wise scan over a list of raw date values.
 * Returns the detected scheme: "day-first" if we find Day-First evidence,
 * "month-first" if we find Month-First evidence, and "unknown" otherwise.
 */
export function detectColumnDateScheme(values: any[]): "day-first" | "month-first" | "unknown" {
  let dayFirstVotes = 0;
  let monthFirstVotes = 0;

  for (const val of values) {
    if (val === undefined || val === null || val === "" || val instanceof Date || typeof val === "number") {
      continue;
    }

    const str = String(val).trim();
    const num = Number(str);
    if (!isNaN(num) && num > 0) continue; // ignore numbers

    const analysis = analyzeSingleDateString(str);
    if (analysis.isDmyOrMdy) {
      const { a, b, y } = analysis.isDmyOrMdy;
      const validAsDmy = isValidCalendarDate(y, b, a);
      const validAsMdy = isValidCalendarDate(y, a, b);

      if (a === b) continue;

      if (validAsDmy && !validAsMdy) {
        dayFirstVotes++;
      } else if (!validAsDmy && validAsMdy) {
        monthFirstVotes++;
      }
    }
  }

  if (dayFirstVotes > monthFirstVotes) {
    return "day-first";
  } else if (monthFirstVotes > dayFirstVotes) {
    return "month-first";
  }
  return "unknown";
}

/**
 * Main standardisation pipeline to scan a list of records, detect their date formats,
 * generate DateStandardisationRecords, and update standard date fields.
 */
export function runBatchDateStandardisation(
  records: any[],
  worksheet: string,
  fieldMappingConfig: Array<{ fieldKey: string; originalColumn: string }>,
  date1904?: boolean,
  existingStandardisations: DateStandardisationRecord[] = []
): {
  updatedRecords: any[];
  standardisationRecords: DateStandardisationRecord[];
} {
  const updatedRecords = records.map(r => ({ ...r }));
  const newStandardisationRecords: DateStandardisationRecord[] = [];

  // Map of existing configs to preserve user corrections & approvals
  const existingMap = new Map<string, DateStandardisationRecord>();
  existingStandardisations.forEach(est => {
    if (est.worksheet === worksheet) {
      const key = `${est.recordId}_${est.fieldKey}`;
      existingMap.set(key, est);
    }
  });

  // Process column-by-column to perform column-wise propagation
  fieldMappingConfig.forEach(({ fieldKey, originalColumn }) => {
    if (!originalColumn) return;

    // Collect all raw values for this column
    const rawValues = records.map(r => {
      // Find row raw column value
      if (r.originalSummaryRow && r.originalSummaryRow[originalColumn] !== undefined) {
        return r.originalSummaryRow[originalColumn];
      }
      if (r.originalGranularRow && r.originalGranularRow[originalColumn] !== undefined) {
        return r.originalGranularRow[originalColumn];
      }
      if (r.originalValues && r.originalValues[originalColumn] !== undefined) {
        return r.originalValues[originalColumn];
      }
      return r[originalColumn] !== undefined ? r[originalColumn] : r[fieldKey];
    });

    const detectedScheme = detectColumnDateScheme(rawValues);

    updatedRecords.forEach((rec, idx) => {
      const recordId = rec.recordId || rec.id || `REC-${worksheet}-${idx + 1}`;
      const lookupKey = `${recordId}_${fieldKey}`;
      const existing = existingMap.get(lookupKey);

      let rawVal: any = "";
      if (rec.originalSummaryRow && rec.originalSummaryRow[originalColumn] !== undefined) {
        rawVal = rec.originalSummaryRow[originalColumn];
      } else if (rec.originalGranularRow && rec.originalGranularRow[originalColumn] !== undefined) {
        rawVal = rec.originalGranularRow[originalColumn];
      } else if (rec.originalValues && rec.originalValues[originalColumn] !== undefined) {
        rawVal = rec.originalValues[originalColumn];
      } else {
        rawVal = rec[originalColumn] !== undefined ? rec[originalColumn] : rec[fieldKey];
      }

      if (rawVal === undefined || rawVal === null) {
        rawVal = "";
      }

      const rawValStr = (rawVal && typeof rawVal === "object" && rawVal instanceof Date) ? rawVal.toISOString() : String(rawVal);

      // If already human corrected or confirmed, keep it!
      if (existing && (existing.reviewStatus === "Human Corrected" || existing.reviewStatus === "Automatically Standardised" && existing.confirmedBy)) {
        newStandardisationRecords.push(existing);
        rec[fieldKey] = existing.standardisedDate;
        return;
      }

      // Otherwise, run standardiser
      const result = standardiseSingleValue(rawVal, detectedScheme, date1904);

      let finalStatus = result.status;
      let finalDate = result.standardised;
      let method = result.method;

      if (detectedScheme !== "unknown" && detectedScheme !== undefined && method === "Column-wise format propagation") {
        method = `Column Propagation (${detectedScheme === "day-first" ? "Day-First" : "Month-First"} detected standard)`;
      }

      const stdRec: DateStandardisationRecord = {
        id: existing?.id || `DATE-STD-${worksheet}-${fieldKey}-${recordId}`,
        worksheet,
        recordId,
        originalColumn,
        fieldKey,
        originalValue: rawValStr,
        detectedFormat: result.detectedFormat,
        standardisedDate: finalDate,
        alternativeInterpretation: result.alternative,
        detectionMethod: method,
        reviewStatus: finalStatus,
        isAmbiguous: result.isAmbiguous,
        confirmedBy: existing?.confirmedBy,
        confirmedAt: existing?.confirmedAt,
        userCorrection: existing?.userCorrection
      };

      newStandardisationRecords.push(stdRec);
      rec[fieldKey] = finalDate;
    });
  });

  return {
    updatedRecords,
    standardisationRecords: newStandardisationRecords
  };
}

/**
 * Merges new standardisation records with existing ones.
 */
export function mergeStandardisationRecords(
  current: DateStandardisationRecord[],
  newRecs: DateStandardisationRecord[],
  worksheet: string
): DateStandardisationRecord[] {
  const filtered = current.filter(r => r.worksheet !== worksheet);
  return [...filtered, ...newRecs];
}

/**
 * Standardises dates across all three business collections (Invoices, POs, and GRNs).
 */
export function standardiseAllCollections(
  invs: InvoiceLine[],
  pos: POLine[],
  grns: GRNLine[],
  currentStds: DateStandardisationRecord[],
  summaryMappings: ColumnMapping[],
  date1904: boolean = false
): {
  invoices: InvoiceLine[];
  poLines: POLine[];
  grnLines: GRNLine[];
  dateStandardisations: DateStandardisationRecord[];
} {
  let allStds = [...currentStds];

  // 1. Invoices
  let updatedInvoices = [...invs];
  const sDateCol = summaryMappings.find(m => m.suggestedField === "invoiceDate")?.originalColumn;
  const sDueDateCol = summaryMappings.find(m => m.suggestedField === "invoiceDueDate")?.originalColumn;
  
  if (sDateCol || sDueDateCol) {
    const invConfigs: Array<{ fieldKey: string; originalColumn: string }> = [];
    if (sDateCol) invConfigs.push({ fieldKey: "invoiceDate", originalColumn: sDateCol });
    if (sDueDateCol) invConfigs.push({ fieldKey: "invoiceDueDate", originalColumn: sDueDateCol });

    // Store raw date fields in originalDateValues if not already set
    updatedInvoices = updatedInvoices.map(inv => {
      const origs = (inv as any).originalDateValues || {};
      if (sDateCol && !origs["invoiceDate"]) {
        const raw = inv.originalSummaryRow?.[sDateCol] !== undefined ? inv.originalSummaryRow[sDateCol] : inv.invoiceDate;
        origs["invoiceDate"] = raw;
      }
      if (sDueDateCol && !origs["invoiceDueDate"]) {
        const raw = inv.originalSummaryRow?.[sDueDateCol] !== undefined ? inv.originalSummaryRow[sDueDateCol] : inv.invoiceDueDate;
        origs["invoiceDueDate"] = raw;
      }
      return { ...inv, originalDateValues: origs };
    });

    const res = runBatchDateStandardisation(updatedInvoices, "Invoices Summary", invConfigs, date1904, allStds);
    updatedInvoices = res.updatedRecords as InvoiceLine[];
    allStds = mergeStandardisationRecords(allStds, res.standardisationRecords, "Invoices Summary");
  }

  // 2. POs
  let updatedPOs = [...pos];
  updatedPOs = updatedPOs.map(po => {
    const origs = po.originalValues || {};
    if (!origs["poDate"]) {
      origs["poDate"] = po.poDate;
    }
    if (!origs["expectedDelivery"]) {
      origs["expectedDelivery"] = po.expectedDelivery;
    }
    return { ...po, originalValues: origs };
  });

  const poConfigs = [
    { fieldKey: "poDate", originalColumn: "PO Date" },
    { fieldKey: "expectedDelivery", originalColumn: "Expected Delivery Date" }
  ];
  const resPO = runBatchDateStandardisation(updatedPOs, "PO Lines", poConfigs, date1904, allStds);
  updatedPOs = resPO.updatedRecords as POLine[];
  allStds = mergeStandardisationRecords(allStds, resPO.standardisationRecords, "PO Lines");

  // 3. GRNs
  let updatedGRNs = [...grns];
  updatedGRNs = updatedGRNs.map(grn => {
    const origs = grn.originalValues || {};
    if (!origs["grnDate"]) {
      origs["grnDate"] = grn.grnDate;
    }
    return { ...grn, originalValues: origs };
  });

  const grnConfigs = [
    { fieldKey: "grnDate", originalColumn: "GRN Date" }
  ];
  const resGRN = runBatchDateStandardisation(updatedGRNs, "GRN Lines", grnConfigs, date1904, allStds);
  updatedGRNs = resGRN.updatedRecords as GRNLine[];
  allStds = mergeStandardisationRecords(allStds, resGRN.standardisationRecords, "GRN Lines");

  return {
    invoices: updatedInvoices,
    poLines: updatedPOs,
    grnLines: updatedGRNs,
    dateStandardisations: allStds
  };
}

