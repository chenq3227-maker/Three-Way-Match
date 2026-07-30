const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

const targetOld = `  const handleCorrectDateRecord = (id: string, textValue: string) => {
    const match = textValue.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);
    if (!match) {
      alert("Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);

    const { isValidCalendarDate } = require("../lib/dateStandardiser");
    if (!isValidCalendarDate(y, m, d)) {`;

const targetNew = `  const handleCorrectDateRecord = (id: string, textValue: string) => {
    const match = textValue.match(/^(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})$/);
    if (!match) {
      alert("Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    const { isValidCalendarDate } = require("../lib/dateStandardiser");
    if (!isValidCalendarDate(y, m, d)) {`;

code = code.replace(targetOld, targetNew);
fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Fixed handleCorrectDateRecord correctly");
