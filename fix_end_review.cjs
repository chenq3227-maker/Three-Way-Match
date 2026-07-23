const fs = require('fs');
let code = fs.readFileSync('src/components/Step2POGRNInput.tsx', 'utf8');

code = code.replace(
  `                <UserCheck className="h-4 w-4" />
                <span>Verify & Commit Document</span>
              </button>
            </div>
          </div>
          </div>
        </motion.div>
      )}`,
  `                <UserCheck className="h-4 w-4" />
                <span>Verify & Commit Document</span>
              </button>
            </div>
            </>
            )}
          </div>
          </div>
        </motion.div>
      )}`
);

fs.writeFileSync('src/components/Step2POGRNInput.tsx', code);
console.log("Done");
