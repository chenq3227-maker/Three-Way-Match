const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const generateContentWithRetryStr = `async function generateContentWithRetry(ai, model, contents, config, maxRetries = 2) {
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
      console.log(\`Gemini API error, retrying in \$\{delay\}ms...\`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}
`;

code = code.replace(
  `// ----------------------------------------------------------------------
// API Routes`,
  generateContentWithRetryStr + `\n// ----------------------------------------------------------------------\n// API Routes`
);

code = code.replace(
  `    // First AI Validation Pass: Initial Extraction
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [documentPart, { text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });`,
  `    // First AI Validation Pass: Initial Extraction (Using PRO for highest accuracy on handwritten documents)
    const response = await generateContentWithRetry(ai, "gemini-2.5-pro", [documentPart, { text: prompt }], {
      responseMimeType: "application/json",
      responseSchema: schema,
    });`
);

code = code.replace(
  `    const validationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [documentPart, { text: validationPrompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });`,
  `    const validationResponse = await generateContentWithRetry(ai, "gemini-2.5-pro", [documentPart, { text: validationPrompt }], {
      responseMimeType: "application/json",
      responseSchema: schema,
    });`
);

code = code.replace(
  `      diagnostics: {
        model: "gemini-2.5-flash",`,
  `      diagnostics: {
        model: "gemini-2.5-pro",`
);

fs.writeFileSync('server.ts', code);
console.log("Done");
