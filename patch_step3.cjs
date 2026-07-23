const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `  const [reviewDecision, setReviewDecision] = useState<"Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval">("Pending Investigation");`,
  `  const [reviewDecision, setReviewDecision] = useState<any>("Pending Investigation");
  const [duplicateReviewDecision, setDuplicateReviewDecision] = useState<any>("Pending Investigation");
  const [duplicateIdentifiedOriginalId, setDuplicateIdentifiedOriginalId] = useState("");
  const [showDuplicateCompareModal, setShowDuplicateCompareModal] = useState(false);`
);

code = code.replace(
  `    setReviewerName(line.humanReview?.reviewerName || "");
    setReviewNotes(line.humanReview?.notes || "");
    setReviewDecision(line.humanReview?.reviewDecision || "Pending Investigation");`,
  `    setReviewerName(line.humanReview?.reviewerName || line.duplicateReviewerName || "");
    setReviewNotes(line.humanReview?.notes || line.duplicateReviewNotes || "");
    setReviewDecision(line.humanReview?.reviewDecision || "Pending Investigation");
    setDuplicateReviewDecision(line.duplicateReviewDecision || "Pending Investigation");
    setDuplicateIdentifiedOriginalId(line.duplicateIdentifiedOriginalId || "");`
);

code = code.replace(
  `    const isResolving = reviewDecision === "Resolved – Send for Department Approval";`,
  `    const isDuplicateException = selectedLine?.exceptions?.some(e => e.type.includes("Duplicate Warning"));
    const isResolving = isDuplicateException ? (duplicateReviewDecision === "Confirmed Duplicate" || duplicateReviewDecision === "Not a Duplicate") : reviewDecision === "Resolved – Send for Department Approval";
    
    if (isDuplicateException && duplicateReviewDecision === "Confirmed Duplicate" && !duplicateIdentifiedOriginalId) {
      setFormError("For a confirmed duplicate, you must identify the original invoice Record ID.");
      return;
    }`
);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3-1");
