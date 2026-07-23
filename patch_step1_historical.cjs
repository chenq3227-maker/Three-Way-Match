const fs = require('fs');
let code = fs.readFileSync('src/components/Step1InvoiceRegister.tsx', 'utf8');

code = code.replace(
  `const fileInputRef = useRef<HTMLInputElement>(null);`,
  `const fileInputRef = useRef<HTMLInputElement>(null);
  const historicalFileInputRef = useRef<HTMLInputElement>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);`
);

// We need to parse historical file differently.
code = code.replace(
  `  const handleMappingCancel = () => {`,
  `  const onHistoricalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHistoricalLoading(true);
    setError(null);
    try {
      // Just parse standard invoices
      const rows = await parseExcelFile(file);
      // We will assume it maps to our headers somewhat easily for historical, but we could just do a simple map or save rows directly.
      // Actually, since historical checking in \`matchingEngine.ts\` searches for \`inv.invoiceNumber === updatedLine.duplicateOf\`,
      // we need \`historicalInvoices\` to have \`invoiceNumber\` and \`recordId\` populated.
      // Let's do a naive mapping for the historical register.
      const mapped = rows.map((r, i) => {
        let invNo = r["Invoice Number"] || r["Invoice No"] || r["invoice_number"] || "";
        let supplier = r["Supplier Name"] || r["Supplier"] || r["supplier_name"] || "";
        let fileSource = r["Source File"] || file.name;
        let date = r["Invoice Date"] || r["Date"] || "";
        let po = r["PO Number"] || r["PO"] || "";
        let desc = r["Item Description"] || r["Item"] || "";
        let qty = r["Quantity Invoiced"] || r["Qty"] || 0;
        let price = r["Unit Price"] || r["Price"] || 0;
        let total = r["Invoice Total"] || r["Total"] || 0;

        return {
          recordId: \`HIST-\$\{i+1\}\`,
          invoiceNumber: String(invNo),
          supplierName: String(supplier),
          sourceFileName: String(fileSource),
          invoiceDate: String(date),
          poNumber: String(po),
          itemDescription: String(desc),
          quantityInvoiced: Number(qty) || 0,
          unitPrice: Number(price) || 0,
          invoiceTotal: Number(total) || 0,
        } as InvoiceLine;
      });
      setHistoricalInvoices(mapped);
    } catch (err: any) {
      setError(\`Error loading historical file: \$\{err.message\}\`);
    } finally {
      setHistoricalLoading(false);
      if (historicalFileInputRef.current) historicalFileInputRef.current.value = "";
    }
  };

  const handleMappingCancel = () => {`
);

code = code.replace(
  `            <p className="text-xs font-semibold text-gray-800">Select or Drop Excel Workbook Here</p>
            <p className="text-[10px] text-gray-400 mt-1">Supports standard App 1 Multi-Sheet or General Single-Sheet layouts (.xlsx, .xls)</p>
          </div>
        </div>
      )}`,
  `            <p className="text-xs font-semibold text-gray-800">Select or Drop Excel Workbook Here</p>
            <p className="text-[10px] text-gray-400 mt-1">Supports standard App 1 Multi-Sheet or General Single-Sheet layouts (.xlsx, .xls)</p>
          </div>
          
          <div
            onClick={() => historicalFileInputRef.current?.click()}
            className={\`mt-4 cursor-pointer border border-dashed rounded-2xl p-6 text-center transition-all duration-200 
              border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300\`}
          >
            <input
              type="file"
              ref={historicalFileInputRef}
              onChange={onHistoricalFileSelect}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 mb-2">
              <History className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-semibold text-gray-700">Optional: Upload Historical Invoice Register</p>
            <p className="text-[9px] text-gray-400 mt-1">For historical duplicate checking against past batches</p>
            {historicalLoading && <p className="text-[9px] text-indigo-500 mt-1">Loading...</p>}
            {historicalInvoices.length > 0 && <p className="text-[10px] text-green-600 font-bold mt-2">Loaded {historicalInvoices.length} historical invoices.</p>}
          </div>
        </div>
      )}`
);

fs.writeFileSync('src/components/Step1InvoiceRegister.tsx', code);
console.log("Done patch step1 historical");
