const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`async function generateContentWithRetry(ai, model, contents, config, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config
      });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      console.log(\`Gemini API error, retrying in \${delay}ms...\`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}`,
`async function generateContentWithRetry(ai, model, contents, config, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config
      });
    } catch (error) {
      if (error.status === 429 || (error.message && error.message.includes("429"))) {
         // Stop automatic retries on 429 Quota Exceeded
         throw error;
      }
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      console.log(\`Gemini API error, retrying in \${delay}ms...\`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}`
);

// We should also forward the 429 explicitly
code = code.replace(
`    res.status(500).json({ error: error.message || "Failed to extract document information" });`,
`    if (error.status === 429 || (error.message && error.message.includes("429"))) {
      res.status(429).json({ error: "Daily AI extraction quota has been reached.", retryAfter: error.headers?.get?.("retry-after") || 60 });
    } else {
      res.status(500).json({ error: error.message || "Failed to extract document information" });
    }`
);

fs.writeFileSync('server.ts', code);
console.log("Done");
