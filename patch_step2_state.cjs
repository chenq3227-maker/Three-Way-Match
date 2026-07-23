const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace('const [excelLoading, setExcelLoading] = useState(false);', 
`const [aiStatus, setAiStatus] = useState<"Checking..." | "Connected" | "Quota Exceeded (429)" | "Model Unavailable (404)" | "Request Failed">("Checking...");
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  useEffect(() => {
    fetch("/api/ai-status")
      .then(r => r.json())
      .then(d => {
        setAiStatus(d.status || "Request Failed");
        setAiErrorMsg(d.error || "");
      })
      .catch(e => {
        setAiStatus("Request Failed");
        setAiErrorMsg(e.message);
      });
  }, []);
  const [excelLoading, setExcelLoading] = useState(false);`);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
