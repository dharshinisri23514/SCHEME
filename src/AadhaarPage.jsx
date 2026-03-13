// ------------------- AadhaarPage.jsx -------------------
import React from "react";

export default function AadhaarPage({ data }) {
  const {
    name,
    dobRaw,
    dobDate,
    gender,
    aadhaar,
    raw,
  } = data;

  // Helper – download JSON of the extracted data
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aadhaar_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.title}>🪪 Aadhaar Card Details</h2>

      <table style={styles.table}>
        <tbody>
          <tr>
            <td>Name</td>
            <td>{name ?? "Not found"}</td>
          </tr>
          <tr>
            <td>Date of Birth</td>
            <td>{dobRaw ?? "Not found"}</td>
          </tr>
          <tr>
            <td>Gender</td>
            <td>{gender ?? "Not found"}</td>
          </tr>
          <tr>
            <td>Aadhaar No.</td>
            <td style={styles.mono}>{aadhaar ?? "Not found"}</td>
          </tr>
        </tbody>
      </table>

      <button style={styles.btn} onClick={downloadJson}>
        ⬇️ Download JSON
      </button>

      {/* Optional: raw OCR text for debugging */}
      <details style={{ marginTop: 12 }}>
        <summary>Show raw OCR text</summary>
        <pre style={styles.pre}>{raw}</pre>
      </details>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Inline‑CSS just to keep the snippet self‑contained */
const styles = {
  section: {
    maxWidth: "640px",
    margin: "32px auto",
    padding: "24px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,.08)",
  },
  title: { color: "#800000", marginBottom: "12px" },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: "16px" },
  mono: { fontFamily: "monospace", letterSpacing: "2px" },
  btn: {
    background: "#800000",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 18px",
    cursor: "pointer",
  },
  pre: { background: "#f5f5f5", padding: "8px", borderRadius: "4px" },
};
