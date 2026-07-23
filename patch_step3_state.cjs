const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `  const [reviewDecision, setReviewDecision] = useState<
    "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval"
  >("Pending Investigation");
  const [formError, setFormError] = useState<string | null>(null);`,
  `  const [reviewDecision, setReviewDecision] = useState<
    "Pending Investigation" | "Keep on Hold" | "Resolved – Send for Department Approval"
  >("Pending Investigation");
  const [duplicateReviewDecision, setDuplicateReviewDecision] = useState<any>("Pending Investigation");
  const [duplicateIdentifiedOriginalId, setDuplicateIdentifiedOriginalId] = useState("");
  const [showDuplicateCompareModal, setShowDuplicateCompareModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);`
);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3 state");
