const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `    }
    const hasExternalDuplicateWarning = 
      updatedLine.duplicateStatus === "Possible Duplicate" || 
      updatedLine.duplicateStatus === "Exact Duplicate";

    // Unresolved extraction checks`,
  `    }

    // Unresolved extraction checks`
);

code = code.replace(
  `    const calculationError = Math.abs(lineAmt - expectedLineAmount) >= 0.01;

    // Check duplicate statuses
    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);`,
  `    const calculationError = Math.abs(lineAmt - expectedLineAmount) >= 0.01;

    // Check duplicate statuses
    const hasExternalDuplicateWarning = 
      updatedLine.duplicateStatus === "Possible Duplicate" || 
      updatedLine.duplicateStatus === "Exact Duplicate";
      
    const isInternalDuplicate = duplicatePairs.has(updatedLine.recordId);`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done patch matching engine var");
