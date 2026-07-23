const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

const regex = /                  <\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/s;

const replacement = `                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
