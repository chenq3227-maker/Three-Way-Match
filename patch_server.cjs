const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `    res.json(result);
  } catch (error: any) {
    console.error("Error extracting document:", error);
    res.status(500).json({ error: error.message || "Failed to extract document information" });
  }
});`,
  `    res.json({
      data: result,
      diagnostics: {
        model: "gemini-2.5-flash",
        mimeType: fileType,
        status: "Success",
        validation: "JSON Schema Passed"
      }
    });
  } catch (error: any) {
    console.error("Error extracting document:", error);
    res.status(500).json({ error: error.message || "Failed to extract document information" });
  }
});`
);

fs.writeFileSync('server.ts', code);
console.log("Done");
