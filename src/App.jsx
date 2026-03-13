import React, { useEffect, useState } from "react";
import SchemePreview from "./SchemePreview.jsx";
import TRANSLATIONS from "./translations";
import "./App.css";
import DocumentResult from "./DocumentResult.jsx";
import OcrScanner from "./OcrScanner";

// ------------------ SCHEMES ------------------
const SCHEMES = [
  {
    id: 1,
    title: "Post Matric Scholarship (SC/ST/OBC/Minorities/PwD)",
    emoji: "📝",
    region: "Central",
    desc: "Financial assistance for post-matric courses to students from disadvantaged categories.",
    fund: "Tuition fee + maintenance allowance (varies by category)",
    tags: ["Students", "Inclusion", "Education"],
  },
  {
    id: 2,
    title: "Indira Gandhi National Old Age Pension Scheme (IGNOAPS)",
    emoji: "🧓",
    region: "Central",
    desc: "Monthly pension for elderly persons belonging to BPL households.",
    fund: "₹200 – ₹500 per month (enhanced for 80+)",
    tags: ["Senior Citizens", "BPL", "Pension"],
  },
  {
    id: 3,
    title: "Rashtriya Vayoshri Yojana (RVY)",
    emoji: "♿",
    region: "Central",
    desc: "Provides assisted-living devices for senior citizens in BPL category suffering from age-related disabilities.",
    fund: "Free devices support",
    tags: ["Senior Citizens", "Disability"],
  },
  {
    id: 4,
    title: "Pradhan Mantri Awaas Yojana – Gramin (PMAY-G)",
    emoji: "🏡",
    region: "Central",
    desc: "Provides pucca houses with basic amenities to homeless and those living in kutcha/dilapidated houses.",
    fund: "₹1.2 – ₹1.5 lakh per house",
    tags: ["Housing", "Rural Development"],
  },
  {
    id: 5,
    title: "Ayushman Bharat - PM Jan Arogya Yojana (PMJAY)",
    emoji: "🩺",
    region: "Central",
    desc: "Provides ₹5 lakh annual health insurance cover per family for secondary & tertiary care.",
    fund: "₹5,00,000 per family/year",
    tags: ["Health", "Insurance"],
  },
  {
    id: 6,
    title: "National Apprenticeship Promotion Scheme (NAPS)",
    emoji: "🛠️",
    region: "Central",
    desc: "Promotes apprenticeship training by supporting establishments and providing stipends to apprentices.",
    fund: "Stipend + govt contribution",
    tags: ["Skills", "Apprenticeship"],
  },
  {
    id: 7,
    title: "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)",
    emoji: "📚",
    region: "Central",
    desc: "Skill training for youth to improve employability and livelihood opportunities.",
    fund: "Free training + certification",
    tags: ["Skills", "Youth"],
  },
  {
    id: 8,
    title: "Deendayal Antyodaya Yojana – NRLM (Self Help Groups)",
    emoji: "👩‍🦰",
    region: "Central",
    desc: "Mobilizes rural poor women into SHGs and provides financial support for livelihood generation.",
    fund: "₹15,000 – ₹50,000 group support",
    tags: ["Women", "Self Help Groups"],
  },
  {
    id: 9,
    title: "Deendayal Antyodaya Yojana – NULM",
    emoji: "🏙️",
    region: "Central",
    desc: "Supports urban poor with skill training, micro-enterprises, shelters, and assistance to street vendors.",
    fund: "Financial + skill training support",
    tags: ["Urban", "Employment"],
  },
  {
    id: 10,
    title: "Senior Citizen Pension",
    emoji: "👵",
    region: "State",
    desc: "Monthly pension for eligible elderly citizens under state welfare programs.",
    fund: "₹1,000 – ₹2,500 per month",
    tags: ["Senior Citizens", "Pension"],
  },
  {
    id: 11,
    title: "National Urban Livelihood Mission",
    emoji: "🏙️",
    region: "Central",
    desc: "Skill training and livelihood support for urban poor households.",
    fund: "Variable stipend + placement support",
    tags: ["Employment", "Skills"],
  },
];

// ------------------ APP ------------------
function App() {
  const [lang, setLang] = useState("en");
  const t = TRANSLATIONS[lang];

  // -------- Profile state --------
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : null;
  });
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    age: "",
    gender: "",
    mobile: "",
    aadhar: "",
    address: "",
    income: "",
    isFarmer: false,
    isStudent: false,
    isSenior: false,
    isDisability: false,
  });

  // --- OCR result preview state ---
  const [ocrResult, setOcrResult] = useState(() => {
    // Restore last OCR result from localStorage on page load
    try {
      const raw = localStorage.getItem("schemelink_ocr_last");
      if (!raw) return null;
      const { result, savedAt } = JSON.parse(raw);
      // Expire after 24 hours
      if (Date.now() - savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem("schemelink_ocr_last");
        return null;
      }
      // Rebuild date object (JSON doesn't preserve Date)
      if (result.dobRaw) {
        result.dobDate = null; // will be recomputed when needed
      }
      return result;
    } catch (_) { return null; }
  });

  useEffect(() => {
    if (profile) {
      localStorage.setItem("userProfile", JSON.stringify(profile));
    }
  }, [profile]);

  function handleProfileChange(e) {
    const { name, type, value, checked } = e.target;
    setProfileDraft((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function saveProfile() {
    const allFilled = Object.entries(profileDraft).every(([key, val]) => {
      if (typeof val === "boolean") return true;
      return val && val.toString().trim() !== "";
    });
    if (!allFilled) {
      alert(t.fillAllFields);
      return;
    }
    setProfile(profileDraft);
  }

  // -------- Eligible Schemes Filter --------
  function getEligibleSchemes(profileData) {
    if (!profileData) return [];

    let tagsToCheck = [];

    if (profileData.isStudent) tagsToCheck.push("Students", "Education");
    if (profileData.isFarmer) tagsToCheck.push("Farmers", "Agriculture");
    if (profileData.isSenior) tagsToCheck.push("Senior Citizens", "Pension");
    if (profileData.isDisability) tagsToCheck.push("Disability");

    if (profileData.gender === "Female") {
      tagsToCheck.push("Women", "Girls", "Girl Child");
    } else if (profileData.gender === "Male") {
      tagsToCheck.push("Men", "Boys");
    } else if (profileData.gender === "Other") {
      tagsToCheck.push("Transgender", "Inclusion");
    }

    const income = parseInt(profileData.income, 10) || 0;
    if (income <= 10000) {
      tagsToCheck.push(
        "BPL",
        "Low-Income",
        "Welfare",
        "Poverty",
        "Social Security"
      );
    }

    return SCHEMES.filter((scheme) =>
      scheme.tags.some((tag) => tagsToCheck.includes(tag))
    );
  }

  // ------------------ OCR parsing helpers ------------------
  // parseDateString: attempts multiple date formats and returns JS Date or null
  function parseDateString(dateStr) {
    if (!dateStr) return null;
    dateStr = dateStr.trim();

    // yyyy-mm-dd or yyyy/mm/dd
    let m = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));

    // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
    m = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      let d = parseInt(m[1], 10),
        mo = parseInt(m[2], 10),
        y = parseInt(m[3], 10);
      if (y < 100) y += y > 30 ? 1900 : 2000;
      return new Date(y, mo - 1, d);
    }

    // formats like "12 May 1995" or "12-May-1995"
    m = dateStr.match(/^(\d{1,2})\s*[\-\/]?\s*([A-Za-z]+)\s*[\-\/]?\s*(\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const monthName = m[2].slice(0, 3).toLowerCase();
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      let year = parseInt(m[3], 10);
      if (year < 100) year += year > 30 ? 1900 : 2000;
      if (months[monthName] !== undefined) return new Date(year, months[monthName], day);
    }

    // fallback: try to parse via Date constructor (least reliable)
    const maybe = new Date(dateStr);
    if (!isNaN(maybe.getTime())) return maybe;

    return null;
  }

  function calcAgeFromDate(d) {
    if (!d || !(d instanceof Date) || isNaN(d)) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }

  // extractFromOcrText: main heuristic extractor returning object {name, dobRaw, dobDate, age, gender}
  function extractFromOcrText(rawText) {
    const text = rawText || "";
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const whole = lines.join("\n");

    // 1) NAME detection: prioritized labeled patterns
    let name = null;
    const nameLabelRegex = /(?:name|applicant|holder|beneficiary|candidate|नाम|নাম|నామం|नाम)\s*[:\-\s]\s*(.+)/i;
    for (let l of lines) {
      let m = l.match(nameLabelRegex);
      if (m) {
        name = m[1].replace(/[,|\/\\\d].*$/, "").trim();
        if (name.length > 1) break;
      }
    }

    // fallback: find a line that looks like a person's name
    if (!name) {
      const candidates = lines.filter((l) => {
        if (l.length < 3 || l.length > 60) return false;
        if (/government|certificate|date|issue|father|mother|address|dob|year|id|serial|no|regis|sign/i.test(l)) return false;
        if (/^[A-Z\s]+$/.test(l) && l.split(/\s+/).length <= 5) return true;
        if (/^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(l)) return true;
        return false;
      });
      if (candidates.length) {
        candidates.sort((a, b) => a.length - b.length);
        name = candidates[0].replace(/[^A-Za-z\s\-\.]/g, "").trim();
      }
    }

    // 2) DOB detection: labeled and pattern-based
    const datePatterns = [
      /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/g,
      /(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/g,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/ig,
    ];

    let dobRaw = null;
    let dobDate = null;

    // check labeled DOB line first
    for (let l of lines) {
      let m = l.match(/\b(?:dob|date of birth|birth date|जन्म|పుట్టిన)\b\s*[:\-\s]?\s*(.+)/i);
      if (m) {
        const candidate = m[1];
        const dCandidate = candidate.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/) ||
                           candidate.match(/(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/) ||
                           candidate.match(/(\d{1,2}\s+\w+\s+\d{2,4})/);
        if (dCandidate) {
          dobDate = parseDateString(dCandidate[1]);
          if (dobDate) { dobRaw = dCandidate[1]; break; }
        }
      }
    }

    // general patterns if not found
    if (!dobDate) {
      for (let pat of datePatterns) {
        let m;
        const re = new RegExp(pat);
        while ((m = re.exec(whole)) !== null) {
          const d = parseDateString(m[1]);
          if (d && d.getFullYear() > 1900 && d.getFullYear() <= new Date().getFullYear()) {
            dobDate = d;
            dobRaw = m[1];
            break;
          }
          if (d && d.getFullYear() > 1900) {
            dobDate = d;
            dobRaw = m[1];
            break;
          }
        }
        if (dobDate) break;
      }
    }

    // 3) Gender detection
    let gender = null;
    const genderLabel = whole.match(/\b(?:gender|sex|लिंग|लैंगिकता)\b\s*[:\-\s]?\s*(male|female|m|f|other|transgender|male\/female)\b/i);
    if (genderLabel) {
      const g = genderLabel[1].toLowerCase();
      if (g.startsWith("m") && g !== "female") gender = "Male";
      else if (g.startsWith("f")) gender = "Female";
      else gender = g.charAt(0).toUpperCase() + g.slice(1);
    } else {
      if (/\bfemale\b/i.test(whole)) gender = "Female";
      else if (/\bmale\b/i.test(whole)) gender = "Male";
      else if (/\btransgender\b/i.test(whole) || /\bother\b/i.test(whole)) gender = "Other";
      else {
        const sexShort = whole.match(/\bsex\s*[:\-\s]?\s*([MF])\b/i);
        if (sexShort) gender = sexShort[1].toUpperCase() === "M" ? "Male" : "Female";
      }
    }

    const age = dobDate ? calcAgeFromDate(dobDate) : null;

    return {
      name: name || null,
      dobRaw: dobRaw || null,
      dobDate: dobDate || null,
      age: age,
      gender: gender || null,
      raw: rawText,
    };
  }

  // ✅ Single return only (main render)
  return (
    <div className="app-root">
      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="logo">SL</div>
            <div>
              <div className="site-title">{t.siteName}</div>
              <div className="site-sub">{t.tagline}</div>
            </div>
          </div>

          <div className="nav-right">
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिंदी</option>
            </select>

            <nav className="top-nav">
              <a href="#home">Home</a>
              <a href="#schemes">{t.popularSchemes}</a>
              <a href="#profile">{t.profile}</a>
              <a href="#ocr">OCR</a>
              <a href="#about">{t.aboutTitle}</a>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="hero">
          <div className="container hero-inner">
            <h1 className="hero-title">{t.heroTitle}</h1>
            <p className="hero-sub">{t.heroSubtitle}</p>
            <div className="search-row">
              <input placeholder={t.searchPlaceholder} className="search-input" />
              <select className="search-select">
                <option>{t.allRegions}</option>
                <option>Andhra Pradesh</option>
                <option>Tamil Nadu</option>
              </select>
              <button className="search-btn">{t.search}</button>
            </div>
          </div>
        </section>

        {/* Schemes Section */}
        <div id="schemes" className="container schemes-section">
          <h2>{t.popularSchemes}</h2>
          <div className="scheme-grid">
            {SCHEMES.map((s) => (
              <article key={s.id} className="scheme-card">
                <div className="scheme-head">
                  <div className="scheme-emoji">{s.emoji}</div>
                  <h3 className="scheme-title">{s.title}</h3>
                </div>
                <p>{s.desc}</p>
                <p className="scheme-fund">
                  <strong>💰 {t.fundLabel}:</strong> {s.fund}
                </p>
                <div className="tag-row">
                  {s.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  className="apply-btn"
                  onClick={() => alert(`${t.apply}: ${s.title}`)}
                >
                  {t.apply}
                </button>
              </article>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        <section id="profile" className="container profile-section">
          <h2>{t.profile}</h2>
          {!profile ? (
            <div className="profile-card">
              <label>
                Name:
                <input
                  type="text"
                  name="name"
                  value={profileDraft.name}
                  onChange={handleProfileChange}
                />
              </label>
              <label>
                Age:
                <input
                  type="number"
                  name="age"
                  value={profileDraft.age}
                  onChange={handleProfileChange}
                />
              </label>
              <label>
                Gender:
                <select
                  name="gender"
                  value={profileDraft.gender}
                  onChange={handleProfileChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Mobile No:
                <input
                  type="text"
                  name="mobile"
                  value={profileDraft.mobile}
                  onChange={handleProfileChange}
                />
              </label>
              <label>
                Aadhaar No:
                <input
                  type="text"
                  name="aadhar"
                  value={profileDraft.aadhar}
                  onChange={handleProfileChange}
                />
              </label>
              <label>
                Address:
                <textarea
                  name="address"
                  value={profileDraft.address}
                  onChange={handleProfileChange}
                />
              </label>
              <label>
                Monthly Income:
                <input
                  type="number"
                  name="income"
                  value={profileDraft.income}
                  onChange={handleProfileChange}
                />
              </label>

              <div className="checklist">
                <label>
                  <input
                    type="checkbox"
                    name="isFarmer"
                    checked={profileDraft.isFarmer}
                    onChange={handleProfileChange}
                  />{" "}
                  Farmer
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="isStudent"
                    checked={profileDraft.isStudent}
                    onChange={handleProfileChange}
                  />{" "}
                  Student
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="isSenior"
                    checked={profileDraft.isSenior}
                    onChange={handleProfileChange}
                  />{" "}
                  Senior Citizen
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="isDisability"
                    checked={profileDraft.isDisability}
                    onChange={handleProfileChange}
                  />{" "}
                  Disability
                </label>
              </div>

              <button className="save-btn" onClick={saveProfile}>
                {t.saveProfile}
              </button>
            </div>
          ) : (
            <div className="profile-preview">
              <h3>Profile Preview</h3>
              <p>
                <strong>Name:</strong> {profile.name}
              </p>
              <p>
                <strong>Age:</strong> {profile.age}
              </p>
              <p>
                <strong>Gender:</strong> {profile.gender}
              </p>
              <p>
                <strong>Mobile:</strong> {profile.mobile}
              </p>
              <p>
                <strong>Aadhaar:</strong> {profile.aadhar}
              </p>
              <p>
                <strong>Address:</strong> {profile.address}
              </p>
              <p>
                <strong>Income:</strong> {profile.income}
              </p>
              <p>
                <strong>Farmer:</strong> {profile.isFarmer ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>Student:</strong> {profile.isStudent ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>Senior Citizen:</strong> {profile.isSenior ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>Disability:</strong> {profile.isDisability ? "✅ Yes" : "❌ No"}
              </p>

              

              <SchemePreview profile={profile} />

              <button className="save-btn" onClick={() => setProfile(null)}>
                {t.editProfile}
              </button>
            </div>
          )}
        </section>

        {/* ✅ OCR Section Added */}
        <section id="ocr" className="container ocr-section"
        
        >
          <h2>📷 OCR Scheme Matcher</h2>
          <p>
            Upload your Aadhaar Card or Voter ID to auto-detect eligible schemes.
            Results are saved and restored automatically across page refreshes.
          </p>

          {/*
            OcrScanner now receives onExtract(extracted) where extracted is:
            { docType, name, dob, gender, aadhaar, cardNo, fatherName }
            Do NOT pass to extractFromOcrText() — it's already an extracted object.
          */}
          <OcrScanner
            
            onExtract={(extracted) => {
              try {
                console.log("OCR Output:", extracted);

                const notFound = (v) => !v || v === "Not found";

                // Calculate age from DOB string e.g. "30/08/2006"
                let age = null;
                if (!notFound(extracted.dob)) {
                  const dobDate = parseDateString(extracted.dob);
                  age = calcAgeFromDate(dobDate);
                }

                // Normalize into ocrResult shape
                const result = {
                  docType: extracted.docType || "Unknown",
                  name: notFound(extracted.name) ? null : extracted.name,
                  dobRaw: notFound(extracted.dob) ? null : extracted.dob,
                  dobDate: notFound(extracted.dob) ? null : parseDateString(extracted.dob),
                  age,
                  gender: notFound(extracted.gender) ? null : extracted.gender,
                  aadhaar: notFound(extracted.aadhaar) ? null : extracted.aadhaar,
                  cardNo: notFound(extracted.cardNo) ? null : extracted.cardNo,
                  fatherName: notFound(extracted.fatherName) ? null : extracted.fatherName,
                };

                setOcrResult(result);

                // Auto-fill profile draft with extracted values
                setProfileDraft((prev) => ({
                  ...prev,
                  name: result.name || prev.name,
                  age: result.age != null && !isNaN(result.age) ? result.age : prev.age,
                  gender: result.gender || prev.gender,
                  aadhar: result.aadhaar || prev.aadhar,
                }));

              } catch (err) {
                console.error("OCR handler error:", err);
              }
            }}
            

          />{/* OCR Result Preview */}
{ocrResult && (
  
  <div className="ocr-preview">
    <SchemePreview profile={ocrResult} />
    <h3>📄 OCR Extracted Data</h3>

    <p><strong>Name:</strong> {ocrResult.name || "Not found"}</p>
    <p><strong>Age:</strong> {ocrResult.age || "Not found"}</p>
    <p><strong>Gender:</strong> {ocrResult.gender || "Not found"}</p>
    <p><strong>Aadhaar:</strong> {ocrResult.aadhaar || "Not found"}</p>
    <p><strong>Card No:</strong> {ocrResult.cardNo || "Not found"}</p>

    <div className="eligible-schemes">
      <h3>🎯 Matching Schemes (Based on OCR)</h3>

      
    </div>
  </div>
)}


          {/* Confirmation card shown below scanner */}
          
        </section>

        {/* About */}
        <section id="about" className="container about-section">
          <h2>{t.aboutTitle}</h2>
          <p>{t.aboutText}</p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          © SchemeLink — Prototype | Built with ❤️ by Arun - KLNCE
        </div>
      </footer>
    </div>
  );
}

export default App;