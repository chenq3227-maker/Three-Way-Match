const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

const regex = /\/\/ ----------------------------------------------------------------------\n\/\/ Side by Side Column Cell Renderer \(Handles highlight logic\)\n\/\/ ----------------------------------------------------------------------\nfunction renderComparisonCell.*$/s;

// Wait, I want to remove only ONE instance, or replace all matches with a single instance.
// Let's match from the first instance to the end of the file, and replace with a single clean one.
code = code.replace(regex, `// ----------------------------------------------------------------------
// Side by Side Column Cell Renderer (Handles highlight logic)
// ----------------------------------------------------------------------
function renderComparisonCell(
  label: string, 
  value: any, 
  status: "agree" | "disagree" | "missing_doc", 
  extraInfo?: string
) {
  let bgClass = "";
  let textClass = "";
  let borderClass = "";

  if (status === "agree") {
    bgClass = "bg-teal-50/50";
    textClass = "text-teal-900";
    borderClass = "border-teal-100/50";
  } else if (status === "disagree") {
    bgClass = "bg-rose-50";
    textClass = "text-rose-900";
    borderClass = "border-rose-200 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.1)]";
  } else {
    bgClass = "bg-amber-50/30";
    textClass = "text-amber-800/90";
    borderClass = "border-amber-200/40";
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-gray-400 font-semibold uppercase">{label}</div>
      <div
        className={\`text-xs px-2.5 py-1.5 rounded font-medium border \${bgClass} \${textClass} \${borderClass}\`}
      >
        {value === null || value === undefined ? "(missing / empty)" : String(value)}
      </div>
      {extraInfo && (
        <div className="text-[10px] text-red-600/95 font-bold mt-0.5 leading-tight">
          {extraInfo}
        </div>
      )}
    </div>
  );
}`);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
