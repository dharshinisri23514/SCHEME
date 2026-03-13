// SchemePreview.jsx
import React, { useState } from "react";
import SCHEMES from "./schemeData";

function SchemePreview({ profile }) {
  const [appliedScheme, setAppliedScheme] = useState(null);

  if (!profile) return null;

  let tagsToCheck = [];

  if (profile.isStudent) tagsToCheck.push("Students", "Education");
  if (profile.isFarmer) tagsToCheck.push("Farmers", "Agriculture");
  if (profile.isSenior || profile.age >= 60)
    tagsToCheck.push("Senior Citizens", "Pension");
  if (profile.isDisability) tagsToCheck.push("Disability");

  if (profile.gender === "Female")
    tagsToCheck.push("Women", "Girls", "Girl Child");
  else if (profile.gender === "Male")
    tagsToCheck.push("Men", "Boys");
  else if (profile.gender === "Other")
    tagsToCheck.push("Transgender", "Inclusion");

  const income = parseInt(profile.income, 10) || 0;
  if (income <= 10000)
    tagsToCheck.push(
      "BPL",
      "Low-Income",
      "Welfare",
      "Poverty",
      "Social Security"
    );

  const matchedSchemes = SCHEMES.filter((scheme) =>
    scheme.tags.some((tag) => tagsToCheck.includes(tag))
  );

  return (
    <div className="scheme-preview-container">
      <h2 className="scheme-title-main">🎯 Eligible Schemes For You</h2>

      <div className="scheme-grid">
        {matchedSchemes.length > 0 ? (
          matchedSchemes.map((s) => (
            <div key={s.id} className="scheme-card-animated">
              <div className="scheme-head">
                <span className="scheme-emoji">{s.emoji}</span>
                <h3>{s.title}</h3>
              </div>

              <p className="scheme-desc">{s.desc}</p>

              <div className="scheme-fund">
                💰 {s.fund}
              </div>

              <div className="scheme-tags">
                {s.tags.map((tag, i) => (
                  <span key={i} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>

              <button
                className="apply-btn-animated"
                onClick={() => setAppliedScheme(s.title)}
              >
                Apply Now
              </button>
            </div>
          ))
        ) : (
          <p className="no-scheme-text">
            No schemes match your profile.
          </p>
        )}
      </div>

      {/* Success Modal */}
      {appliedScheme && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>✅ Application Submitted</h3>
            <p>You have successfully applied for:</p>
            <strong>{appliedScheme}</strong>
            <button
              className="close-modal-btn"
              onClick={() => setAppliedScheme(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchemePreview;
