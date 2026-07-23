const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `{/* Top level fields */}
              {extractedData && scanDocType === "po" ? (`,
  `{/* Top level fields */}
              {extractedData && (scanDocType === "po" ? (`
);
code = code.replace(
  `{renderExtractedField("Remarks", "remarks", extractedData.remarks?.value, extractedData.remarks?.status, handleExtractedFieldChange, extractedData.remarks?.originalText, extractedData.remarks?.note)}
                </>`,
  `{renderExtractedField("Remarks", "remarks", extractedData.remarks?.value, extractedData.remarks?.status, handleExtractedFieldChange, extractedData.remarks?.originalText, extractedData.remarks?.note)}
                </>
              ))`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
