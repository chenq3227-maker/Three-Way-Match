const fs = require('fs');
let code = fs.readFileSync('src/lib/matchingEngine.ts', 'utf8');

code = code.replace(
  `          if (!duplicateCandidates.has(b.recordId)) duplicateCandidates.set(b.recordId, a);
        }
      }
    }
  }`,
  `          if (!duplicateCandidates.has(b.recordId)) duplicateCandidates.set(b.recordId, a);
        }
    }
  }`
);

fs.writeFileSync('src/lib/matchingEngine.ts', code);
console.log("Done");
