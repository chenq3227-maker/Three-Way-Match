/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx-js-style";

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, any>[];
  rawRows: any[][];
  sheetNames: string[];
  date1904?: boolean;
  sheets?: Record<string, { headers: string[]; rows: Record<string, any>[] }>;
}

/**
 * Parses an Excel file and returns headers, row objects, and raw grid data.
 */
export function parseExcelFile(file: File): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("No data loaded from file");
        }

        const workbook = XLSX.read(data, { type: "array", cellDates: true, dateNF: "yyyy-mm-dd" });
        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
          throw new Error("Excel workbook contains no sheets");
        }

        // We load the first sheet by default
        const selectedSheetName = sheetNames[0];
        const worksheet = workbook.Sheets[selectedSheetName];
        
        // Extract raw data as grid (array of arrays)
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        
        // Parse all sheets
        const sheets: Record<string, { headers: string[]; rows: Record<string, any>[] }> = {};
        for (const name of sheetNames) {
          const ws = workbook.Sheets[name];
          const rawGrid = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
          if (rawGrid.length === 0) {
            sheets[name] = { headers: [], rows: [] };
            continue;
          }
          let hIdx = 0;
          for (let i = 0; i < Math.min(rawGrid.length, 10); i++) {
            const row = rawGrid[i];
            if (row && row.some(cell => cell !== null && cell !== "")) {
              hIdx = i;
              break;
            }
          }
          const sheetHeaders = rawGrid[hIdx].map((h: any, colIdx) => {
            if (h === null || h === undefined || h === "") {
              return `Column_${colIdx + 1}`;
            }
            return String(h).trim();
          });
          const sheetRows: Record<string, any>[] = [];
          for (let i = hIdx + 1; i < rawGrid.length; i++) {
            const rawRow = rawGrid[i];
            if (!rawRow || rawRow.every(cell => cell === null || cell === "")) {
              continue;
            }
            const rowObj: Record<string, any> = {};
            sheetHeaders.forEach((header, index) => {
              rowObj[header] = rawRow[index] !== undefined ? rawRow[index] : "";
            });
            sheetRows.push(rowObj);
          }
          sheets[name] = { headers: sheetHeaders, rows: sheetRows };
        }

        if (rawRows.length === 0) {
          resolve({ headers: [], rows: [], rawRows: [], sheetNames, date1904: !!workbook.Workbook?.WBProps?.date1904, sheets });
          return;
        }

        // Find header row (usually first row, but could be empty space before)
        let headerIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const row = rawRows[i];
          if (row && row.some(cell => cell !== null && cell !== "")) {
            headerIndex = i;
            break;
          }
        }

        const headers = rawRows[headerIndex].map((h: any, colIdx) => {
          if (h === null || h === undefined || h === "") {
            return `Column_${colIdx + 1}`;
          }
          return String(h).trim();
        });

        // Convert the remaining rows into objects mapped by header name
        const rows: Record<string, any>[] = [];
        for (let i = headerIndex + 1; i < rawRows.length; i++) {
          const rawRow = rawRows[i];
          // Skip completely empty rows
          if (!rawRow || rawRow.every(cell => cell === null || cell === "")) {
            continue;
          }
          const rowObj: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObj[header] = rawRow[index] !== undefined ? rawRow[index] : "";
          });
          rows.push(rowObj);
        }

        resolve({
          headers,
          rows,
          rawRows,
          sheetNames,
          date1904: !!workbook.Workbook?.WBProps?.date1904,
          sheets
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File reading error"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Helper to zero-pad date components into standard YYYY-MM-DD format.
 */
function formatComponentsToYYYYMMDD(y: number, m: number, d: number): string {
  const year = String(y).padStart(4, "0");
  const month = String(m).padStart(2, "0");
  const day = String(d).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Decodes numeric Excel date serial number to calendar year, month, and day components,
 * correctly supporting both the 1900 and 1904 date systems timezone-independently.
 */
function decodeExcelSerial(serial: number, date1904?: boolean): { y: number; m: number; d: number } {
  let val = Math.round(serial);
  if (date1904) {
    // 1904 system starts on Jan 1, 1904. We add 1462 days to map to the 1900 base.
    val += 1462;
  }

  // Excel 1900 leap year bug: Excel falsely treats 1900 as a leap year.
  if (val === 60) {
    return { y: 1900, m: 2, d: 29 };
  } else if (val < 60) {
    // Before March 1, 1900, no leap year correction needed
  } else {
    // Correction for nonexistent Feb 29, 1900
    val -= 1;
  }

  // Dec 30, 1899 is the base offset for serial 1 (representing Jan 1, 1900 minus correction)
  const baseDate = new Date(Date.UTC(1899, 11, 30));
  const targetDate = new Date(baseDate.getTime() + val * 24 * 60 * 60 * 1000);

  return {
    y: targetDate.getUTCFullYear(),
    m: targetDate.getUTCMonth() + 1,
    d: targetDate.getUTCDate()
  };
}

/**
 * Single, robust, shared date-only parser. Parses any date field (Invoice, PO, GRN)
 * and returns a standard date-only value in YYYY-MM-DD format, without time or timezone.
 */
export function formatDate(val: any, date1904?: boolean): string {
  if (val === undefined || val === null || val === "") return "";

  // 1. If already a Date object (SheetJS cellDates: true, or manualJS Date)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const y = val.getUTCFullYear();
    const m = val.getUTCMonth() + 1;
    const d = val.getUTCDate();
    const res = formatComponentsToYYYYMMDD(y, m, d);
    verifyDateRoundTrip(res);
    return res;
  }

  // 2. If numeric Excel serial number
  if (typeof val === "number") {
    // Excel dates typically fall between 1 and 2958465 (Jan 1, 1900 to Dec 31, 9999)
    if (val > 0 && val < 3000000) {
      const decoded = decodeExcelSerial(val, date1904);
      const res = formatComponentsToYYYYMMDD(decoded.y, decoded.m, decoded.d);
      verifyDateRoundTrip(res);
      return res;
    }
    return "";
  }

  // 3. If a string representing a date, parse the stated structure directly
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "";

    // Ignore time/timezone portions (T00:00:00, etc.)
    const datePortion = trimmed.split(/[ T]/)[0];

    // Check for YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = datePortion.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);
      const res = formatComponentsToYYYYMMDD(y, m, d);
      verifyDateRoundTrip(res);
      return res;
    }

    // Check for DD/MM/YYYY or D/M/YYYY (day-first standard AP format)
    const dmyMatch = datePortion.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      let d = parseInt(dmyMatch[1], 10);
      let m = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);
      
      // If month is > 12 and day <= 12, it is MM/DD/YYYY
      if (m > 12 && d <= 12) {
        const tmp = d;
        d = m;
        m = tmp;
      }
      const res = formatComponentsToYYYYMMDD(y, m, d);
      verifyDateRoundTrip(res);
      return res;
    }

    // Check for DD/MM/YY or D/M/YY
    const dmyShortMatch = datePortion.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (dmyShortMatch) {
      let d = parseInt(dmyShortMatch[1], 10);
      let m = parseInt(dmyShortMatch[2], 10);
      const shortY = parseInt(dmyShortMatch[3], 10);
      const y = shortY >= 50 ? 1900 + shortY : 2000 + shortY;

      if (m > 12 && d <= 12) {
        const tmp = d;
        d = m;
        m = tmp;
      }
      const res = formatComponentsToYYYYMMDD(y, m, d);
      verifyDateRoundTrip(res);
      return res;
    }

    // Fallback: parse using standard JS Date constructor but read local calendar components to preserve stated values
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const useUTC = trimmed.includes("T") || trimmed.includes("Z");
      const y = useUTC ? parsed.getUTCFullYear() : parsed.getFullYear();
      const m = (useUTC ? parsed.getUTCMonth() : parsed.getMonth()) + 1;
      const d = useUTC ? parsed.getUTCDate() : parsed.getDate();
      const res = formatComponentsToYYYYMMDD(y, m, d);
      verifyDateRoundTrip(res);
      return res;
    }

    // If it's a numeric string, try parsing it as a number
    const numVal = Number(trimmed);
    if (!isNaN(numVal) && numVal > 0 && numVal < 3000000) {
      const decoded = decodeExcelSerial(numVal, date1904);
      const res = formatComponentsToYYYYMMDD(decoded.y, decoded.m, decoded.d);
      verifyDateRoundTrip(res);
      return res;
    }

    return trimmed;
  }

  return String(val);
}

/**
 * Display date-only values as DD/MM/YYYY by formatting stored year, month, and day components directly.
 * Prevents timezone-sensitive conversion, locale shift, or string-to-timestamp automatic adjustments.
 */
export function formatStoredDateForDisplay(storedDate: string): string {
  if (!storedDate) return "";
  const trimmed = storedDate.trim();

  // YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  // If already in DD/MM/YYYY format, return as-is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Fallback to formatDate and transform
  const parsed = formatDate(trimmed);
  const secondMatch = parsed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (secondMatch) {
    return `${secondMatch[3]}/${secondMatch[2]}/${secondMatch[1]}`;
  }

  return trimmed;
}

/**
 * Converts formatted date back into a JS Date object at midnight UTC for Excel cell writing.
 */
export function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Match YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  // Match DD/MM/YYYY
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

/**
 * Strict internal round-trip validation confirming that:
 * - Imported calendar date (YYYY-MM-DD)
 * - Displayed calendar date (DD/MM/YYYY)
 * - Exported calendar date (UTC Date components)
 * remain absolutely identical.
 */
export function verifyDateRoundTrip(stored: string): boolean {
  if (!stored) return true;

  // 1. Stored components
  const storedMatch = stored.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!storedMatch) return false;
  const sY = parseInt(storedMatch[1], 10);
  const sM = parseInt(storedMatch[2], 10);
  const sD = parseInt(storedMatch[3], 10);

  // 2. Display representation
  const displayed = formatStoredDateForDisplay(stored);
  const dispMatch = displayed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!dispMatch) return false;
  const dD = parseInt(dispMatch[1], 10);
  const dM = parseInt(dispMatch[2], 10);
  const dY = parseInt(dispMatch[3], 10);

  if (sY !== dY || sM !== dM || sD !== dD) {
    console.error(`[ROUND-TRIP FAILURE] Stored and Display components mismatch: stored='${stored}', displayed='${displayed}'`);
    return false;
  }

  // 3. Export representation
  const exportedDate = parseDDMMYYYY(stored);
  if (!exportedDate) return false;
  const eY = exportedDate.getUTCFullYear();
  const eM = exportedDate.getUTCMonth() + 1;
  const eD = exportedDate.getUTCDate();

  if (sY !== eY || sM !== eM || sD !== eD) {
    console.error(`[ROUND-TRIP FAILURE] Stored and Export components mismatch: stored='${stored}', exportedUTC='${exportedDate.toUTCString()}'`);
    return false;
  }

  return true;
}

/**
 * Normalises a currency or numeric value.
 */
export function formatCurrencyValue(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[^0-9\.\-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
