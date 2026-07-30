const fs = require('fs');
let code = fs.readFileSync('src/lib/excelParser.ts', 'utf8');

const targetOld = `export function formatStoredDateForDisplay(storedDate: string): string {
  if (!storedDate) return "";
  const trimmed = storedDate.trim();

  // YYYY-MM-DD
  const match = trimmed.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (match) {
    return \`\${match[3]}/\${match[2]}/\${match[1]}\`;
  }

  // If already in DD/MM/YYYY format, return as-is
  if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Fallback to formatDate and transform
  const parsed = formatDate(trimmed);
  const secondMatch = parsed.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (secondMatch) {
    return \`\${secondMatch[3]}/\${secondMatch[2]}/\${secondMatch[1]}\`;
  }

  return trimmed;
}`;

const targetNew = `export function formatStoredDateForDisplay(storedDate: string): string {
  if (!storedDate) return "";
  const trimmed = storedDate.trim();

  // YYYY-MM-DD
  const match = trimmed.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (match) {
    return trimmed; // Already YYYY-MM-DD
  }

  // If already in DD/MM/YYYY format, transform it
  const dmyMatch = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return \`\${y}-\${m}-\${d}\`;
  }

  // Fallback to formatDate (which returns YYYY-MM-DD)
  const parsed = formatDate(trimmed);
  if (parsed) {
    return parsed;
  }

  return trimmed;
}`;

code = code.replace(targetOld, targetNew);

const parseTargetOld = `  // Match DD/MM/YYYY
  const match = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);`;

// Wait, the parser doesn't need changing necessarily, it handles DD/MM/YYYY. But let's check parseDDMMYYYY.
fs.writeFileSync('src/lib/excelParser.ts', code);
console.log("Updated formatStoredDateForDisplay");
