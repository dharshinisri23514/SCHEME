// ------------------- DocumentResult.jsx -------------------
import React from "react";
import AadhaarPage from "./AadhaarPage.jsx";
import VoterIdPage from "./VoterIdPage.jsx";
import IncomePage from "./IncomePage.jsx";

/**
 * Props:
 *   result – the object returned by OcrScanner (already stored in App state)
 */
export default function DocumentResult({ result }) {
  if (!result) return null;

  switch (result.docType?.toLowerCase()) {
    case "aadhaar card":
    case "aadhaar":
      return <AadhaarPage data={result} />;
    case "voter id":
    case "voter":
      return <VoterIdPage data={result} />;
    case "income proof":
    case "income":
      return <IncomePage data={result} />;
    default:
      return (
        <div style={{ padding: "1rem", background: "#fff8e1", borderRadius: 8 }}>
          <h3>⚠️ Unknown / unsupported document</h3>
          <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>
            {result.raw || "No OCR text available"}
          </pre>
        </div>
      );
  }
}
