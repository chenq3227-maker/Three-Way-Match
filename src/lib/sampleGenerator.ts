/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx-js-style";

/**
 * Generates a mock Invoice Register Excel workbook and triggers a browser download.
 */
export function downloadSampleInvoiceRegister() {
  const data = [
    [
      "Invoice Record ID",
      "Source Document Name",
      "Vendor / Supplier Name",
      "Invoice Number",
      "Invoice Date",
      "Due Date",
      "Bill-To Organization",
      "Associated PO Number",
      "PO Line Item Number",
      "Item Description / Name",
      "Quantity Invoiced",
      "Unit Price",
      "Line Total Amount",
      "Subtotal",
      "Tax (GST)",
      "Invoice Grand Total",
      "Currency Code",
      "Duplicate Check Status",
      "Extraction Quality Status",
      "Fields Requiring Human Review",
      "System Extraction Notes",
      "Vendor Address",
      "Vendor Bank Details",
      "Payment Ref",
      "Payment Terms Days",
      "Supplier Contact Details",
      "Business Reg / Tax ID",
      "Accepted Payment Method",
      "Late Payment Terms"
    ],
    [
      "REC-001",
      "inv_acme_1001.pdf",
      "Acme Industrial Corp",
      "INV-1001",
      "10/07/2026",
      "10/08/2026",
      "Global Corp HQ",
      "PO-100",
      "1",
      "Premium Steel Widget (Grade A)",
      50,
      12.50,
      625.00,
      625.00,
      62.50,
      687.50,
      "USD",
      "Clear",
      "success",
      "",
      "Successfully extracted via OCR.",
      "123 Industrial Way, Chicago IL",
      "Chase Bank - Acct 987654321",
      "TXN-PO100",
      30,
      "contact@acme.com / +1-555-0199",
      "TX-99887766-A",
      "Bank Transfer",
      "2% fee after 30 days"
    ],
    [
      "REC-002",
      "inv_wayne_2045.pdf",
      "Wayne Enterprises",
      "INV-2045",
      "12/07/2026",
      "12/08/2026",
      "Global Corp HQ",
      "PO-101",
      "1",
      "Heavy Duty Grappling Hooks",
      150,
      85.00,
      12750.00,
      12750.00,
      1275.00,
      14025.00,
      "USD",
      "Clear",
      "success",
      "",
      "Handwritten signature detected on source.",
      "1007 Mountain Drive, Gotham City",
      "Gotham Trust - Acct 11223344",
      "TXN-PO101",
      15,
      "info@waynecorp.com",
      "TX-22446688-W",
      "ACH / Wire",
      "1.5% monthly late interest"
    ],
    [
      "REC-003",
      "inv_stark_9901.pdf",
      "Stark Industries Ltd",
      "INV-9901",
      "14/07/2026",
      "14/08/2026",
      "Global Corp HQ",
      "PO-102",
      "1",
      "Vibranium Composite Alloy Plate",
      10,
      1500.00,
      15000.00,
      15000.00,
      1500.00,
      16500.00,
      "USD",
      "Possible Duplicate",
      "success",
      "Duplicate status flag triggered by OCR database match.",
      "OCR flagged possible duplicate invoice number in staging.",
      "10880 El Medio St, Malibu CA",
      "Stark Bank - Acct 88889999",
      "TXN-PO102",
      45,
      "procurement@starkindustries.com",
      "TX-88889999-S",
      "Bank Transfer",
      "Net 45, no late fee"
    ],
    [
      "REC-004",
      "inv_stark_9901_duplicate.pdf",
      "Stark Industries Ltd",
      "INV-9901-DUP",
      "14/07/2026",
      "14/08/2026",
      "Global Corp HQ",
      "PO-102",
      "1",
      "Vibranium Composite Alloy Plate",
      10,
      1500.00,
      15000.00,
      15000.00,
      1500.00,
      16500.00,
      "USD",
      "Clear",
      "success",
      "",
      "Identical line items but different invoice ID. Internal duplicate detection target.",
      "10880 El Medio St, Malibu CA",
      "Stark Bank - Acct 88889999",
      "TXN-PO102-D",
      45,
      "procurement@starkindustries.com",
      "TX-88889999-S",
      "Bank Transfer",
      "Net 45, no late fee"
    ],
    [
      "REC-005",
      "inv_cyber_505.pdf",
      "Cyberdyne Systems",
      "INV-505",
      "15/07/2026",
      "15/08/2026",
      "Global Corp HQ",
      "PO-103",
      "1",
      "Neural Net CPU Microchip v2.0",
      5,
      4500.00,
      22500.00,
      22500.00,
      2250.00,
      24750.00,
      "USD",
      "Clear",
      "success",
      "",
      "Standard system extraction.",
      "Pico Boulevard, Los Angeles CA",
      "Cyber Bank - Acct 00010101",
      "TXN-PO103",
      30,
      "contact@cyberdyne.io",
      "TX-00010101-C",
      "Wire Transfer",
      "3% interest on late payments"
    ],
    [
      "REC-006",
      "inv_lex_881.pdf",
      "LexCorp Aerospace",
      "INV-881",
      "18/07/2026",
      "18/08/2026",
      "Global Corp HQ",
      "PO-104",
      "1",
      "Kryptonite Mineral Specimen",
      2,
      75000.00,
      150000.00,
      150000.00,
      15000.00,
      165000.00,
      "USD",
      "Clear",
      "success",
      "",
      "OCR quality high.",
      "LexCorp Tower, Metropolis",
      "Daily Planet Bank - Acct 55566677",
      "TXN-PO104",
      60,
      "desk@lexcorp.com",
      "TX-55566677-L",
      "ACH",
      "5% interest on late balance"
    ]
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Invoice Register");
  XLSX.writeFile(wb, "Sample_Invoice_Register.xlsx");
}

/**
 * Generates a mock Purchase Order & GRN Excel workbook and triggers a browser download.
 */
export function downloadSamplePOGRNData() {
  const poData = [
    [
      "PO ID",
      "Purchase Order Number",
      "PO Issue Date",
      "Supplier Name / Vendor",
      "Ordered Item Description",
      "Quantity Ordered",
      "Unit Price Amount",
      "Total PO Amount",
      "Expected Delivery Date"
    ],
    [
      "PO-LN-1",
      "PO-100",
      "01/07/2026",
      "Acme Industrial Corp",
      "Premium Steel Widget (Grade A)",
      50,
      12.50,
      625.00,
      "12/07/2026"
    ],
    [
      "PO-LN-2",
      "PO-101",
      "02/07/2026",
      "Wayne Enterprises",
      "Heavy Duty Grappling Hooks",
      150,
      85.00,
      12750.00,
      "15/07/2026"
    ],
    [
      "PO-LN-3",
      "PO-102",
      "03/07/2026",
      "Stark Industries Ltd",
      "Vibranium Composite Alloy Plate",
      10,
      1500.00,
      15000.00,
      "18/07/2026"
    ],
    [
      "PO-LN-4",
      "PO-103",
      "04/07/2026",
      "Cyberdyne Systems",
      "Neural Net CPU Microchip v2.0",
      5,
      4500.00,
      22500.00,
      "20/07/2026"
    ],
    [
      "PO-LN-5",
      "PO-104",
      "05/07/2026",
      "LexCorp Aerospace",
      "Kryptonite Mineral Specimen",
      2,
      70000.00, // Price mismatch! (Invoice says 75,000)
      140000.00,
      "25/07/2026"
    ]
  ];

  const grnData = [
    [
      "GRN Number",
      "GRN Record Date",
      "Related PO Number",
      "Supplier Name",
      "Item Description Received",
      "Quantity Received",
      "Physical Condition",
      "Received By Personnel"
    ],
    [
      "GRN-10001",
      "08/07/2026",
      "PO-100",
      "Acme Industrial Corp",
      "Premium Steel Widget (Grade A)",
      50,
      "Good",
      "Officer J. Carter"
    ],
    // Wayne Enterprises: partial delivery across multiple GRNs (total 120 received out of 150 ordered)
    [
      "GRN-10002",
      "10/07/2026",
      "PO-101",
      "Wayne Enterprises",
      "Heavy Duty Grappling Hooks",
      80,
      "Good",
      "Officer J. Carter"
    ],
    [
      "GRN-10003",
      "13/07/2026",
      "PO-101",
      "Wayne Enterprises",
      "Heavy Duty Grappling Hooks",
      40,
      "Good",
      "Supervisor M. Ross"
    ], // Total received: 120. Invoiced quantity is 150 -> Excess Quantity Invoiced discrepancy!
    [
      "GRN-10004",
      "15/07/2026",
      "PO-102",
      "Stark Industries Ltd",
      "Vibranium Composite Alloy Plate",
      10,
      "Good",
      "Officer J. Carter"
    ],
    [
      "GRN-10005",
      "18/07/2026",
      "PO-103",
      "Cyberdyne Systems",
      "Neural Net CPU Microchip v2.0",
      5,
      "Damaged - Cracks in casing", // Damaged goods exception!
      "Specialist T. Connor"
    ],
    [
      "GRN-10006",
      "22/07/2026",
      "PO-104",
      "LexCorp Aerospace",
      "Kryptonite Mineral Specimen",
      2,
      "Good",
      "Officer J. Carter"
    ]
  ];

  const wb = XLSX.utils.book_new();
  const wsPO = XLSX.utils.aoa_to_sheet(poData);
  const wsGRN = XLSX.utils.aoa_to_sheet(grnData);
  
  XLSX.utils.book_append_sheet(wb, wsPO, "Purchase Orders");
  XLSX.utils.book_append_sheet(wb, wsGRN, "Goods Received Notes");
  
  XLSX.writeFile(wb, "Sample_PO_GRN_Data.xlsx");
}
