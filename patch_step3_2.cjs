const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

code = code.replace(
  `        let newStatus = inv.overallStatus;
        if (inv.recordId === selectedLine.recordId) {
          // Explicit decision mapping
          newStatus = reviewDecision === "Resolved – Send for Department Approval"
            ? "Awaiting Department Approval"
            : reviewDecision === "Keep on Hold"
            ? "On Hold"
            : "Review Required";
        }

        return {
          ...inv,
          overallStatus: newStatus,
          followupStatus: reviewDecision,
          humanReview: {
            reviewerName,
            reviewDecision,
            notes: reviewNotes,
            timestamp,
          },
        };`,
  `        let newStatus = inv.overallStatus;
        let finalReviewDecision = reviewDecision;
        
        if (isDuplicateException) {
          if (inv.recordId === selectedLine.recordId) {
             if (duplicateReviewDecision === "Confirmed Duplicate") {
                newStatus = "On Hold";
             } else if (duplicateReviewDecision === "Not a Duplicate") {
                // If not a duplicate, we should restore it to Review Required, and maybe it will pass on next rematch, 
                // but the instructions say "restore the result produced by the three-way match". We can set it to Awaiting Department Approval if no other errors, 
                // but the matching engine sets the default. We can flag duplicateReviewDecision to "Not a Duplicate" and let rematch handle it if we rematch.
                // But this form just updates it directly. Let's set it to "Awaiting Department Approval" temporarily if there are no other exceptions.
                const otherExceptions = (inv.exceptions || []).filter(e => !e.type.includes("Duplicate Warning"));
                newStatus = otherExceptions.length > 0 ? (otherExceptions.some(e => e.severity === "On Hold") ? "On Hold" : "Review Required") : "Awaiting Department Approval";
             } else {
                newStatus = "Review Required";
             }
          }
          return {
            ...inv,
            overallStatus: newStatus,
            duplicateReviewDecision,
            duplicateReviewNotes: reviewNotes,
            duplicateReviewerName: reviewerName,
            duplicateIdentifiedOriginalId: duplicateIdentifiedOriginalId
          };
        } else {
          if (inv.recordId === selectedLine.recordId) {
            newStatus = reviewDecision === "Resolved – Send for Department Approval"
              ? "Awaiting Department Approval"
              : reviewDecision === "Keep on Hold"
              ? "On Hold"
              : "Review Required";
          }
          return {
            ...inv,
            overallStatus: newStatus,
            followupStatus: reviewDecision,
            humanReview: {
              reviewerName,
              reviewDecision,
              notes: reviewNotes,
              timestamp,
            },
          };
        }`
);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done patch step3-2");
