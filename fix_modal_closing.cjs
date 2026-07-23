const fs = require('fs');
let code = fs.readFileSync('src/components/Step3MatchingDashboard.tsx', 'utf8');

const regex = /<\/>\s*\);\s*\}\)\(\)\}\s*<\/div>\s*<\/div>\s*<\/div>.*?\};*\s*\}/s;

const correctClosing = `                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(regex, correctClosing);

fs.writeFileSync('src/components/Step3MatchingDashboard.tsx', code);
console.log("Done");
