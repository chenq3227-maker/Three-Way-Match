const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
`                </>
              ))
              )}
              {/* Items Table */}`,
`                </>
              ))}
              {/* Items Table */}`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
