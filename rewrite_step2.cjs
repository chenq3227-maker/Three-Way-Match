const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

// 1. Remove useEffect and change aiStatus default
code = code.replace(
  'const [aiStatus, setAiStatus] = useState<"Checking..." | "Connected" | "Quota Exceeded (429)" | "Model Unavailable (404)" | "Request Failed">("Checking...");\n  const [aiErrorMsg, setAiErrorMsg] = useState("");\n  useEffect(() => {\n    fetch("/api/ai-status")\n      .then(r => r.json())\n      .then(d => {\n        setAiStatus(d.status || "Request Failed");\n        setAiErrorMsg(d.error || "");\n      })\n      .catch(e => {\n        setAiStatus("Request Failed");\n        setAiErrorMsg(e.message);\n      });\n  }, []);',
  `const [aiStatus, setAiStatus] = useState<string>("Ready");
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);`
);

// 2. Add handleDocScanUpload and handleAnalyseDocument
const oldHandleDocScanUpload = `  const handleDocScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files: File[] = Array.from(e.target.files);
    
    setScanLoading(true);
    setScanError(null);
    
    const newExtractions: {file: FileData, extractedData: any, docType: "po"|"grn", error?: string, diagnostics?: any}[] = [];
    
    for (const file of files) {
      let base64Url = "";
      try {
        base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const response = await fetch("/api/extract-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Url,
            fileType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
            docType: scanDocType
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || \`Extraction server error (\${response.status})\`);
        }

        const jsonResponse = await response.json();
        const data = jsonResponse.data || jsonResponse;
        const diagnostics = jsonResponse.diagnostics || null;
        newExtractions.push({
          file: {
            name: file.name,
            type: file.type,
            dataUrl: base64Url,
            size: \`\${(file.size / 1024).toFixed(1)} KB\`
          },
          extractedData: data,
          docType: scanDocType,
          diagnostics: diagnostics
        });
      } catch (err: any) {
        setScanError(err.message || \`AI extraction failed for \${file.name}.\`);
        newExtractions.push({
          file: {
            name: file.name,
            type: file.type,
            dataUrl: base64Url,
            size: \`\${(file.size / 1024).toFixed(1)} KB\`
          },
          extractedData: null,
          docType: scanDocType,
          error: err.message
        });
      }
    }
    
    if (newExtractions.length > 0) {
      setPendingScans(prev => [...prev, ...newExtractions]);
    }
    
    setScanLoading(false);
    
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
  };`;

const newHandlers = `  const handleDocScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            size: \`\${(file.size / 1024).toFixed(1)} KB\`
          },
          extractedData: emptyData,
          docType: scanDocType,
          status: "pending_analysis"
        });
      } catch (err: any) {
        setScanError(err.message || \`File read failed for \${file.name}.\`);
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
        throw new Error(errData.error || \`Extraction server error (\${response.status})\`);
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
  };`;

code = code.replace(oldHandleDocScanUpload, newHandlers);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Replaced handleDocScanUpload");
