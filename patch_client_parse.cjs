const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `        const response = await fetch("/api/extract-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docType: scanDocType,
            fileData: base64Url,
            fileType: file.type || (file.name.endsWith("pdf") ? "application/pdf" : "image/jpeg")
          })
        });

        if (!response.ok) {
          const errRes = await response.json().catch(() => ({}));
          throw new Error(errRes.error || \`Server returned \$\{response.status\}\`);
        }

        const data = await response.json();`,
  `        const response = await fetch("/api/extract-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docType: scanDocType,
            fileData: base64Url,
            fileType: file.type || (file.name.endsWith("pdf") ? "application/pdf" : "image/jpeg")
          })
        });

        if (!response.ok) {
          const errRes = await response.json().catch(() => ({}));
          throw new Error(errRes.error || \`Server returned \$\{response.status\}\`);
        }

        const jsonResponse = await response.json();
        const data = jsonResponse.data || jsonResponse; // Handle both wrapped and unwrapped for backward compatibility
        const diagnostics = jsonResponse.diagnostics || { status: "No diagnostics available" };`
);

code = code.replace(
  `        newExtractions.push({
          file: {
            name: file.name,
            type: file.type,
            dataUrl: base64Url,
            size: \`\$\{(file.size / 1024).toFixed(1)\} KB\`
          },
          extractedData: data,
          docType: scanDocType
        });`,
  `        newExtractions.push({
          file: {
            name: file.name,
            type: file.type,
            dataUrl: base64Url,
            size: \`\$\{(file.size / 1024).toFixed(1)\} KB\`
          },
          extractedData: data,
          docType: scanDocType,
          diagnostics: diagnostics
        });`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
