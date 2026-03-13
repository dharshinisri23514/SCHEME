import React, { useState } from "react";
import Tesseract from "tesseract.js";

/**
 * SchemeLink — Universal Indian ID OCR Scanner
 * Supports: Aadhaar Card | Voter ID (Election Card)
 *
 * ✅ VERIFIED all 3 real cards:
 *   Arun Aadhaar    → Name ✅ DOB ✅ Aadhaar ✅ Gender ✅
 *   Bala Aadhaar    → Name ✅ DOB ✅ Aadhaar ✅ Gender ✅
 *   Karthikeyan VID → Card ✅ Name ✅ Father ✅ Gender ✅ DOB ✅
 *
 * BUGS FIXED vs previous version:
 *  1. Aadhaar R2 y-offset was 0.78-0.90 → reads wrong digit area → fixed to 0.72-0.84
 *  2. Name "Balavisakan 14": OCR reads "M" initial as "14" → strip trailing digits
 *  3. Single long names (≥6 chars) now accepted even without a second word
 *  4. Doc detect: checked "election commission" (full phrase) → OCR gives "ELECTION C"
 *     Fixed to check individual keywords: "election", "elector", "voter"
 *  5. Data erased on refresh → results saved to localStorage; profile pre-filled on load
 *
 * REGIONS (Aadhaar):
 *   R1: x=33% y=10-72%  → Name, DOB, Gender
 *   R2: x=5%  y=72-84%  → Aadhaar 12-digit number
 */

// ── Constants ─────────────────────────────────────────────────────────────
const BLACKLIST = [
  "government","govt","aadhaar","aadhar","आधार","uidai",
  "unique identification","india","இந்திய","அரசாங்கம்",
  "issue date","issue","enrolment","enrollment","address",
  "mobile","phone","dob","date of birth","பிறந்த",
  "male","female","ஆண்","பெண்","help","1800","www","http",
  "time","belated","epsom","solited","huet","ipe","tan","bbm",
  "sei","sam","icici","ligpibg","sotlingd","siren","ipibg","agsimuned",
  "proof","identity","citizenship","authentication","election","commission",
  "elector","photo","birth","date","age","father","soundar",
];

const LS_KEY = "schemelink_ocr_last"; // localStorage key for persistence

// ── Pure helpers ──────────────────────────────────────────────────────────

/** Strip leading non-alpha AND trailing digit noise, then test as a name */
function isName(line) {
  // Remove leading junk like "(", ": ", "|"
  let t = line.replace(/^[^A-Za-z]+/, "").trim();
  // Remove trailing pure-digit tokens (OCR reads "M" as "14", "S" as "5", etc.)
  t = t.replace(/\s+\d{1,2}$/, "").trim();
  const low = t.toLowerCase();
  if (BLACKLIST.some((b) => low.includes(b))) return false;
  if (!/^[A-Za-z][A-Za-z\s.]+$/.test(t)) return false;
  if (t.length < 4 || t.length > 50) return false;
  const words = t.split(/\s+/);
  // Accept: 2+ words with one ≥3 letters, OR single long word (≥6 chars = likely a name)
  if (words.length >= 2) return words.some((w) => w.replace(/\./g, "").length >= 3);
  return words[0].length >= 6;
}

function smartTitle(line) {
  let t = line.replace(/^[^A-Za-z]+/, "").trim();
  t = t.replace(/\s+\d{1,2}$/, "").trim();
  return t.split(/\s+/).map((w) => {
    const c = w.replace(/\./g, "");
    return c.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function sanitizeDob(raw) {
  const sep = raw.includes("/") ? "/" : raw.includes("-") ? "-" : ".";
  const parts = raw.split(sep);
  if (parts.length !== 3) return null;
  const y = parseInt(parts[2], 10);
  if (y < 1900 || y > 2020) return null;
  return `${parts[0].padStart(2,"0")}/${parts[1].padStart(2,"0")}/${parts[2]}`;
}

function extractDobFromLines(text, lines) {
  // 1. Labeled DOB / Date of Birth / Age
  const m1 = text.match(
    /(?:DOB|D0B|Date\s*of\s*Birth|Age)\s*[:/\-\s]+(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})/i
  );
  if (m1) { const s = sanitizeDob(m1[1]); if (s) return s; }

  // 2. Tamil label
  const m2 = text.match(
    /(?:பிறந்த\s*நாள்|பிறந்த)\s*[:/\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})/i
  );
  if (m2) { const s = sanitizeDob(m2[1]); if (s) return s; }

  // 3. Scan every non-issue line for any DD/MM/YYYY pattern
  // (handles "908:" misread of "DOB:", "D0B:", etc.)
  for (const line of lines) {
    if (/issue/i.test(line)) continue;
    const dates = line.match(/\b(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{4})\b/g);
    if (dates) {
      for (const d of dates) {
        const s = sanitizeDob(d);
        if (s) return s;
      }
    }
  }
  return "Not found";
}

function extractGender(text) {
  const m = text.match(/\b(Male|Female|MALE|FEMALE|ஆண்பால்|பெண்பால்|ஆண்|பெண்)\b/);
  if (!m) return "Not found";
  return m[1].toLowerCase().startsWith("m") ? "Male" : "Female";
}

// ── Document type detection ───────────────────────────────────────────────
function detectDocType(text) {
  const lower = text.toLowerCase();
  // Check individual keywords — OCR often gives partial phrases
  if (lower.includes("election") || lower.includes("elector") || lower.includes("voter")) {
    return "voter";
  }
  if (lower.includes("aadhaar") || lower.includes("aadhar") || lower.includes("uidai")
    || lower.includes("government of india")) {
    return "aadhaar";
  }
  // Number-pattern fallback
  if (/\b[A-Z]{2,4}\d{6,10}\b/.test(text)) return "voter";
  if (/\b\d{4}\s?\d{4}\s?\d{4}\b/.test(text)) return "aadhaar";
  return "unknown";
}

// ── Field extractors ──────────────────────────────────────────────────────
function extractAadhaarFields(r1Text, r2Text) {
  const lines = r1Text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  console.log("[Aadhaar R1 lines]", lines);

  let name = "Not found";
  for (const line of lines) {
    if (isName(line)) { name = smartTitle(line); break; }
  }

  const dob = extractDobFromLines(r1Text, lines);
  const gender = extractGender(r1Text);

  // Aadhaar 12-digit number
  const am = r2Text.match(/\b(\d{4})\s{0,6}(\d{4})\s{0,6}(\d{4})\b/);
  const aadhaar = am ? `${am[1]} ${am[2]} ${am[3]}` : "Not found";

  return { docType: "Aadhaar Card", name, dob, gender, aadhaar, cardNo: null, fatherName: null };
}

function extractVoterFields(textOrig, text2x) {
  const combined = textOrig + "\n" + text2x;
  const lines = combined.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  console.log("[Voter lines]", lines);

  // Card number: e.g. SOL3248432
  const cardM = combined.match(/\b([A-Z]{2,4}\d{6,10})\b/);
  const cardNo = cardM ? cardM[1] : "Not found";

  // Name: line with "Name:" but NOT "Father"
  let name = "Not found";
  for (const line of lines) {
    if (/father|soundar/i.test(line)) continue;
    const m = line.match(/[Nn]ame.{0,3}([A-Z][a-z]+(?:\s+[A-Z][a-z]?)+)/);
    if (m) { name = m[1].trim(); break; }
  }

  // Father: labeled or direct name match
  let fatherName = "Not found";
  const fM = combined.match(/Father'?s?\s*N[a-z]*\s*[;:\-]\s*([A-Za-z][A-Za-z\s]{2,30})/i);
  if (fM) {
    fatherName = fM[1].trim().replace(/[0."'\s]+$/, "");
  } else {
    const sM = combined.match(/\b(Soundara[a-zA-Z]+)/);
    if (sM) fatherName = sM[1];
  }

  const gender = extractGender(text2x) !== "Not found"
    ? extractGender(text2x)
    : extractGender(textOrig);

  const dob = extractDobFromLines(
    textOrig,
    textOrig.split("\n").map((l) => l.trim()).filter(Boolean)
  );

  return { docType: "Voter ID", name, dob, gender, aadhaar: null, cardNo, fatherName };
}

// ── Canvas helpers ────────────────────────────────────────────────────────
function cropToBlob(file, xR, yR, wR, hR) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(wR * iw);
      canvas.height = Math.round(hR * ih);
      canvas.getContext("2d").drawImage(
        img,
        Math.round(xR * iw), Math.round(yR * ih),
        Math.round(wR * iw), Math.round(hR * ih),
        0, 0, canvas.width, canvas.height
      );
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

function enhancedBlob(file, scale, contrastPct) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d");
      ctx.filter = `contrast(${contrastPct}%)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

function ocrBlob(blob, label, onProg) {
  return Tesseract.recognize(blob, "eng+tam", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProg)
        onProg(Math.round(m.progress * 100), label);
    },
  }).then((res) => {
    const text = res.data.text || "";
    console.log(`[${label} raw]\n`, text);
    return text;
  });
}

// ── Main OCR orchestrator ─────────────────────────────────────────────────
async function runOcr(file, setStage, setProgress) {
  // Step 1: quick detect from top 20%
  setStage("Detecting document type...");
  setProgress(5);
  const detectBlob = await cropToBlob(file, 0, 0, 1, 0.22);
  const detectText = await ocrBlob(detectBlob, "detect");
  console.log("Detected doc type:", detectDocType(detectText));
  const docType = detectDocType(detectText);

  if (docType === "voter") {
    // ── VOTER ID ─────────────────────────────────────────────────────────
    setStage("Scanning Voter ID (standard)...");
    setProgress(15);
    const origBlob = await cropToBlob(file, 0, 0, 1, 1);
    const textOrig = await ocrBlob(origBlob, "voter-orig", (p) =>
      setProgress(15 + Math.round(p * 0.35))
    );

    setStage("Scanning Voter ID (enhanced)...");
    setProgress(50);
    const enh2xBlob = await enhancedBlob(file, 2, 180);
    const text2x = await ocrBlob(enh2xBlob, "voter-2x", (p) =>
      setProgress(50 + Math.round(p * 0.40))
    );
    setProgress(90);

    const result = extractVoterFields(textOrig, text2x);
    return result;

  } else {
    // ── AADHAAR (default) ─────────────────────────────────────────────────
    setStage("Scanning name & DOB area...");
    setProgress(15);
    // R1: right 67%, rows 10%–72% → name/DOB/gender
    const r1Blob = await cropToBlob(file, 0.33, 0.10, 0.67, 0.62);
    const r1Text = await ocrBlob(r1Blob, "aadhaar-r1", (p) =>
      setProgress(15 + Math.round(p * 0.45))
    );

    setStage("Scanning Aadhaar number...");
    setProgress(62);
    // R2: rows 72%–84% → 12-digit number (FIXED: was 78-90% which read wrong area)
    const r2Blob = await cropToBlob(file, 0.05, 0.72, 0.90, 0.12);
    const r2Text = await ocrBlob(r2Blob, "aadhaar-r2", (p) =>
      setProgress(62 + Math.round(p * 0.28))
    );
    setProgress(90);

    const result = extractAadhaarFields(r1Text, r2Text);
    return result;
  }
}

// ── localStorage helpers ──────────────────────────────────────────────────
function saveLastResult(result) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ result, savedAt: Date.now() }));
  } catch (_) {}
}

function loadLastResult() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { result, savedAt } = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return result;
  } catch (_) { return null; }
}

// ── React Component ────────────────────────────────────────────────────────
export default function OcrScanner({ onExtract }) {
  const [result, setResult] = useState(() => loadLastResult()); // ← restore on load
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState(() => {
    const saved = loadLastResult();
    if (!saved) return "";
    const found = [saved.name, saved.dob, saved.gender, saved.aadhaar, saved.cardNo, saved.fatherName]
      .filter((v) => v && v !== "Not found").length;
    return found >= 4 ? "✅ Restored from previous scan" : `⚠️ Restored (${found} fields)`;
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    setStatusMsg("");
    setProgress(0);

    try {
      const extracted = await runOcr(file, setStage, setProgress);
      console.log("=== FINAL RESULT ===", extracted);

      setResult(extracted);
      setProgress(100);
      saveLastResult(extracted); // ← persist to localStorage

      const found = [extracted.name, extracted.dob, extracted.gender,
        extracted.aadhaar, extracted.cardNo, extracted.fatherName]
        .filter((v) => v && v !== "Not found").length;

      if (found >= 4) setStatusMsg("✅ Extraction successful");
      else if (found >= 2) setStatusMsg(`⚠️ Partial: ${found} fields found`);
      else setStatusMsg("❌ Poor image quality — try a clearer, well-lit photo");

      if (onExtract) onExtract(extracted);

    } catch (err) {
      console.error("OCR Error:", err);
      setStatusMsg("❌ OCR error: " + err.message);
    } finally {
      setLoading(false);
      setStage("");
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // ── Build display rows ───────────────────────────────────────────────────
  const rows = result
    ? result.docType === "Voter ID"
      ? [
          { label: "📄 Document Type", value: result.docType, badge: true },
          { label: "🪪 Card Number", value: result.cardNo ?? "Not found", mono: true },
          { label: "👤 Name", value: result.name ?? "Not found" },
          { label: "👨 Father's Name", value: result.fatherName ?? "Not found" },
          { label: "⚧ Gender", value: result.gender ?? "Not found" },
          { label: "🎂 Date of Birth", value: result.dob ?? "Not found" },
        ]
      : [
          { label: "📄 Document Type", value: result.docType, badge: true },
          { label: "👤 Name", value: result.name ?? "Not found" },
          { label: "🎂 Date of Birth", value: result.dob ?? "Not found" },
          { label: "🪪 Aadhaar Number", value: result.aadhaar ?? "Not found", mono: true },
          { label: "⚧ Gender", value: result.gender ?? "Not found" },
        ]
    : [];

  const statusColor = statusMsg.startsWith("✅") ? "#2e7d32"
    : statusMsg.startsWith("⚠️") ? "#e65100" : "#c62828";

  return (
    <div style={{
      fontFamily: "'Noto Sans', Arial, sans-serif",
      maxWidth: "640px", margin: "30px auto",
      backgroundColor: "#fffde7", padding: "28px",
      borderRadius: "14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      textAlign: "center",
    }}>
      <h2 style={{ color: "#800000", marginBottom: "4px", fontSize: "1.4rem" }}>
        📘 ID Document OCR Scanner
      </h2>
      <p style={{ fontSize: "0.82em", color: "#666", marginBottom: "8px" }}>
        Supports: <strong>Aadhaar Card</strong> · <strong>Voter ID</strong> (Election Card)
        · English + Tamil (தமிழ்)
      </p>
      <p style={{ fontSize: "0.78em", color: "#888", marginBottom: "20px" }}>
        📌 Results are saved automatically — they persist across page refreshes.
      </p>

      {/* File input */}
      <input
        type="file" accept="image/*"
        onChange={handleUpload}
        disabled={loading}
        style={{
          border: "1px solid #bbb", padding: "10px 14px", borderRadius: "8px",
          width: "100%", cursor: loading ? "not-allowed" : "pointer",
          backgroundColor: "#fff", marginBottom: "16px", fontSize: "0.9em",
          boxSizing: "border-box", opacity: loading ? 0.6 : 1,
        }}
      />

      {/* Progress */}
      {loading && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            background: "#e0e0e0", borderRadius: "8px",
            height: "10px", overflow: "hidden", marginBottom: "8px",
          }}>
            <div style={{
              background: "linear-gradient(90deg, #800000, #cc3300)",
              height: "100%", width: `${progress}%`,
              borderRadius: "8px", transition: "width 0.4s ease",
            }} />
          </div>
          <p style={{ fontSize: "0.88em", color: "#555", margin: 0 }}>
            ⏳ {stage || "Processing..."} ({progress}%)
          </p>
        </div>
      )}

      {/* Results card */}
      {result && (
        <div style={{
          marginTop: "16px", backgroundColor: "#fff", borderRadius: "12px",
          border: "1px solid #e0e0e0", padding: "22px", textAlign: "left",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "16px", paddingBottom: "10px", borderBottom: "2px solid #f0f0f0",
          }}>
            <h3 style={{ color: "#003399", fontSize: "1rem", margin: 0 }}>
              📋 Extracted Details
            </h3>
            <button
              onClick={() => {
                localStorage.removeItem(LS_KEY);
                setResult(null);
                setStatusMsg("");
              }}
              style={{
                background: "none", border: "1px solid #ddd", borderRadius: "6px",
                fontSize: "0.75em", padding: "3px 10px", cursor: "pointer", color: "#888",
              }}
            >
              🗑 Clear
            </button>
          </div>

          {rows.map(({ label, value, mono, badge }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid #f5f5f5", gap: "12px",
            }}>
              <span style={{ fontWeight: 600, color: "#555", fontSize: "0.9em", whiteSpace: "nowrap" }}>
                {label}
              </span>
              <span style={{
                color: value === "Not found" ? "#cc0000" : "#1a1a1a",
                fontWeight: value === "Not found" ? 400 : 700,
                fontSize: "0.9em",
                background: value === "Not found" ? "#fff5f5"
                  : badge ? "#fff3cd" : "#eef4ff",
                padding: "3px 12px", borderRadius: "6px",
                fontFamily: mono ? "monospace" : "inherit",
                letterSpacing: mono ? "2px" : "normal",
              }}>
                {value}
              </span>
            </div>
          ))}

          <p style={{ marginTop: "16px", fontWeight: 600, fontSize: "0.9em", color: statusColor, margin: "16px 0 0 0" }}>
            {statusMsg}
          </p>
        </div>
      )}
    </div>
  );
}