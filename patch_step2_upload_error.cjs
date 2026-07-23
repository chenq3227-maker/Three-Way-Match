const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
`      } catch (err: any) {
        setScanError(err.message || \`AI extraction failed for \$\{file.name\}.\`);
        
        break;
      }`,
`      } catch (err: any) {
        setScanError(err.message || \`AI extraction failed for \$\{file.name\}.\`);
        newExtractions.push({
          file: {
            name: file.name,
            type: file.type,
            dataUrl: base64Url,
            size: \`\$\{(file.size / 1024).toFixed(1)\} KB\`
          },
          extractedData: null,
          docType: scanDocType,
          error: err.message
        });
      }`);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
