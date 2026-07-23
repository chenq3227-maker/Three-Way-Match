const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace for /api/extract-doc
code = code.replace(
`    console.error("Error extracting document:", error);
    if (error.status === 429 || (error.message && error.message.includes("429"))) {
      res.status(429).json({ error: "Daily AI extraction quota has been reached.", retryAfter: error.headers?.get?.("retry-after") || 60 });
    } else {
      res.status(500).json({ error: error.message || "Failed to extract document information" });
    }`,
`    if (error.status === 429 || (error.message && error.message.includes("429"))) {
      console.warn("AI extraction quota reached (429)");
      res.status(429).json({ error: "Daily AI extraction quota has been reached.", retryAfter: error.headers?.get?.("retry-after") || 60 });
    } else {
      console.error("Error extracting document:", error);
      res.status(500).json({ error: error.message || "Failed to extract document information" });
    }`
);

// Replace for /api/suggest-mappings
code = code.replace(
`    console.error("Error mapping headers:", error);
    res.status(500).json({ error: error.message || "Failed to suggest mappings" });`,
`    if (error.status === 429 || (error.message && error.message.includes("429"))) {
      console.warn("AI mapping quota reached (429)");
      res.status(429).json({ error: "Daily AI extraction quota has been reached.", retryAfter: error.headers?.get?.("retry-after") || 60 });
    } else {
      console.error("Error mapping headers:", error);
      res.status(500).json({ error: error.message || "Failed to suggest mappings" });
    }`
);

// Replace for /api/check-similarity
code = code.replace(
`    console.error("Error checking description similarity:", error);
    res.status(500).json({ error: error.message || "Failed to check similarity" });`,
`    if (error.status === 429 || (error.message && error.message.includes("429"))) {
      console.warn("AI similarity check quota reached (429)");
      res.status(429).json({ error: "Daily AI extraction quota has been reached.", retryAfter: error.headers?.get?.("retry-after") || 60 });
    } else {
      console.error("Error checking description similarity:", error);
      res.status(500).json({ error: error.message || "Failed to check similarity" });
    }`
);

fs.writeFileSync('server.ts', code);
console.log("Replaced console.error successfully");
