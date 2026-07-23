const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `}
                    </div>
                  </div>
                ))}
              </div>`,
  `}
                    </div>
                  </div>
                ))}
              </div>}`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
