const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

// 1. Remove useEffect and change aiStatus default
code = code.replace(
  'const [aiStatus, setAiStatus] = useState<"Checking..." | "Connected" | "Quota Exceeded (429)" | "Model Unavailable (404)" | "Request Failed">("Checking...");\n  const [aiErrorMsg, setAiErrorMsg] = useState("");\n  useEffect(() => {\n    fetch("/api/ai-status")\n      .then(r => r.json())\n      .then(d => {\n        setAiStatus(d.status || "Request Failed");\n        setAiErrorMsg(d.error || "");\n      })\n      .catch(e => {\n        setAiStatus("Request Failed");\n        setAiErrorMsg(e.message);\n      });\n  }, []);',
  'const [aiStatus, setAiStatus] = useState<string>("Ready");\n  const [aiErrorMsg, setAiErrorMsg] = useState("");\n  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);\n  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);'
);

// 2. Add handleAnalyseDocument
// Wait, I need to add it near handleDocScanUpload.
// Let's first replace handleDocScanUpload entirely.
const uploadRegex = /const handleDocScanUpload = async \[\s\S\]*?  \/\/ Field change handler for verification screen/s;
// Oh wait, regex might be tricky. Let me just use string replacement.
