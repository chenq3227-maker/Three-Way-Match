const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `              </button>
            </div>
            </>
            )}
          </div>
          </div>
        </motion.div>
      )}`,
  `              </button>
            </div>
          </div>
          </div>
        </motion.div>
      )}`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
