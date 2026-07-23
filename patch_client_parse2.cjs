const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `        const response = await fetch("/api/extract-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Url,
            fileType: file.type,
            docType: scanDocType
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Extraction server error");
        }

        const data = await response.json();
        newExtractions.push({`,
  `        const response = await fetch("/api/extract-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Url,
            fileType: file.type || (file.name.endsWith("pdf") ? "application/pdf" : "image/jpeg"),
            docType: scanDocType
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || \`Extraction server error (\$\{response.status\})\`);
        }

        const jsonResponse = await response.json();
        const data = jsonResponse.data || jsonResponse;
        const diagnostics = jsonResponse.diagnostics || null;
        newExtractions.push({`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
