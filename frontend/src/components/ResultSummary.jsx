import { useMemo } from "react";
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const DEFAULT_METRICS = [
  { key: "confidence", label: "Confidence" },
  { key: "knowledgeSkills", label: "Knowledge & Skills" },
  { key: "communication", label: "Communication" },
  { key: "behaviour", label: "Behaviour" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "adaptability", label: "Adaptability" },
  { key: "cultureFit", label: "Culture Fit" },
];

const normalizeKey = (key) =>
  (key || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

const buildLookup = (source) => {
  if (!source || typeof source !== "object") return {};
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    const normalised = normalizeKey(key);
    acc[normalised] = value;
    return acc;
  }, {});
};

const coerceScore = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  if (!Number.isFinite(num)) return undefined;
  return Math.max(0, Math.min(num, 100));
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : entry))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[•\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [value].filter(Boolean);
};

const deriveName = (profile) => {
  if (!profile) return "";
  if (profile.fullName) return profile.fullName;
  if (profile.name) return profile.name;
  const parts = [
    profile.firstName || profile.firstname,
    profile.middleName || profile.middlename,
    profile.lastName || profile.lastname,
  ].filter(Boolean);
  return parts.join(" ").trim();
};

const deriveQualification = (analysis, structured) => {
  const decision = structured?.decision || analysis?.decision || {};
  const direct =
    structured?.is_qualified ??
    structured?.isQualified ??
    decision?.isQualified ??
    decision?.qualified ??
    analysis?.structuredData?.is_qualified ??
    analysis?.structuredData?.isQualified;
  if (typeof direct === "boolean") return direct;

  const status =
    decision?.status ||
    structured?.status ||
    structured?.decisionStatus ||
    "";
  if (typeof status === "string") {
    const lowered = status.toLowerCase();
    if (lowered.includes("qual")) return true;
    if (lowered.includes("not") || lowered.includes("reject")) return false;
  }
  return null;
};

const stripMarkup = (text) => {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/^\s*here'?s a summary of[^:]*:/i, ""); // drop generic intro
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1"); // remove bold markers
  cleaned = cleaned.replace(/[_`~]/g, ""); // drop miscellaneous markdown
  cleaned = cleaned.replace(/[\u2022•]/g, " "); // remove bullet chars
  cleaned = cleaned.replace(/\s*\*\s*/g, " "); // remove asterisk bullets
  cleaned = cleaned.replace(/(?:\s-\s|\s—\s)/g, " "); // remove dash bullets
  cleaned = cleaned.replace(/\s{2,}/g, " "); // collapse whitespace
  cleaned = cleaned.replace(/\s*([.;,])\s*/g, "$1 "); // tidy punctuation spacing
  return cleaned.trim();
};

const ResultSummary = ({ result, onReset }) => {
  const analysis = result?.analysis || {};
  const structured = result?.structuredData || analysis?.structuredData || {};
  const summary =
    result?.summary ||
    analysis?.summary ||
    analysis?.text ||
    "Summary not available yet.";

  const candidateProfile =
    structured?.candidateProfile ||
    structured?.candidate ||
    structured?.personalInformation ||
    structured?.personal_info ||
    {};

  const contactDetails = structured?.contact || analysis?.contact || {};
  const takeaways =
    structured?.takeaways ||
    structured?.feedback ||
    analysis?.takeaways ||
    {};

  const qualification = deriveQualification(analysis, structured);
  const qualificationLabel =
    qualification === null
      ? "Pending Decision"
      : qualification
      ? "Qualified"
      : "Not Qualified";

  const qualificationDescription =
    structured?.decision?.reason ||
    structured?.decisionReason ||
    analysis?.decision?.reason ||
    "";

  const lookups = [
    structured?.evaluation?.scores,
    structured?.evaluation?.metrics,
    structured?.scores,
    structured?.metrics,
    structured?.skillScores,
    analysis?.structuredData?.evaluation?.scores,
    analysis?.scores,
  ]
    .filter(Boolean)
    .map(buildLookup);

  const mergedScores = Object.assign({}, ...lookups);

  const metrics = DEFAULT_METRICS.map(({ key, label }) => {
    const normKey = normalizeKey(key);
    const labelKey = normalizeKey(label);
    const value =
      mergedScores[normKey] ??
      mergedScores[labelKey] ??
      mergedScores[label] ??
      mergedScores[key];
    return { key, label, value: coerceScore(value) };
  });

  const hasScoreData = metrics.some(
    (metric) => typeof metric.value === "number"
  );

  const radarData = useMemo(() => {
    if (!hasScoreData) return null;

    return {
      labels: metrics.map((metric) => metric.label),
      datasets: [
        {
          label: "Candidate Fit",
          data: metrics.map((metric) =>
            typeof metric.value === "number" ? metric.value : 0
          ),
          backgroundColor: "rgba(148, 163, 184, 0.18)",
          borderColor: "rgba(226, 232, 240, 0.85)",
          pointBackgroundColor: "#f1f5f9",
          pointBorderColor: "#020617",
          pointHoverBackgroundColor: "#020617",
          pointHoverBorderColor: "#f1f5f9",
          borderWidth: 2,
        },
      ],
    };
  }, [hasScoreData, metrics]);

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: {
            color: "rgba(148, 163, 184, 0.2)",
          },
          grid: {
            color: "rgba(82, 82, 91, 0.25)",
          },
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: {
            display: false,
          },
          pointLabels: {
            color: "#e2e8f0",
            font: {
              family: "Inter, sans-serif",
              size: 12,
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 15, 16, 0.9)",
          borderColor: "rgba(226, 232, 240, 0.25)",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (context) => `${context.formattedValue} / 100`,
          },
        },
      },
    }),
    []
  );

  const candidateDetails = [
    {
      label: "Name",
      value: deriveName(candidateProfile),
    },
    {
      label: "Email",
      value:
        candidateProfile.email ||
        contactDetails.email ||
        structured?.email ||
        null,
    },
    {
      label: "Phone",
      value:
        candidateProfile.phone ||
        contactDetails.phone ||
        structured?.phone ||
        null,
    },
    {
      label: "Citizenship",
      value:
        candidateProfile.citizenship ||
        candidateProfile.nationality ||
        null,
    },
    {
      label: "Location",
      value:
        candidateProfile.location ||
        candidateProfile.city ||
        candidateProfile.state ||
        structured?.location ||
        null,
    },
  ].filter((item) => item.value);

  const educationDetails = toArray(
    structured?.education ||
      candidateProfile.education ||
      candidateProfile.qualifications
  );

  const programmingLanguages = toArray(
    structured?.programmingLanguages ||
      structured?.skills?.programming ||
      candidateProfile.programmingLanguages ||
      candidateProfile.programming_languages ||
      candidateProfile.languagesOfProgramming
  );

  const recentProject = structured?.recentProject || {};
  const projectHasData =
    recentProject.name ||
    recentProject.description ||
    toArray(recentProject.techStack).length > 0 ||
    toArray(recentProject.confidenceSignals).length > 0;

  const strengths = toArray(
    takeaways.strengths ||
      takeaways.highlights ||
      structured?.strengths ||
      analysis?.highlights
  );
  const improvements = toArray(
    takeaways.improvements ||
      takeaways.developmentAreas ||
      takeaways.recommendations ||
      structured?.improvements ||
      structured?.recommendations
  );
  const cautions = toArray(
    takeaways.watchouts ||
      takeaways.risks ||
      takeaways.concerns ||
      structured?.concerns
  );
  const candidateQuestions = toArray(
    takeaways.candidateQuestions ||
      structured?.candidateQuestions ||
      analysis?.candidateQuestions
  );

  const insights = result?.insights || analysis?.insights || {};
  const notableQuotes = toArray(insights.notableQuotes);
  const followUpActions = toArray(insights.followUpActions);

  const callMeta = result?.call || {};
  const durationText = (() => {
    if (typeof callMeta.duration === "number") {
      if (callMeta.duration >= 60) {
        const mins = callMeta.duration / 60;
        return `${mins >= 10 ? Math.round(mins) : mins.toFixed(1)} mins`;
      }
      return `${Math.max(1, Math.round(callMeta.duration))} secs`;
    }
    if (typeof callMeta.duration === "string") {
      return callMeta.duration;
    }
    return null;
  })();

  return (
    <section className="panel result-panel">
      <header className="result-heading">
        <span
          className={`qualification-badge ${
            qualification === null
              ? "pending"
              : qualification
              ? "qualified"
              : "rejected"
          }`}
        >
          {qualificationLabel}
        </span>
        <h2>Interview Summary</h2>
        <p className="result-blurb">{stripMarkup(summary)}</p>
        {qualificationDescription && (
          <p className="result-note">{qualificationDescription}</p>
        )}
      </header>

      <div className="result-layout">
        <aside className="details-column">
          <div className="detail-card">
            <h3>Candidate Details</h3>
            {candidateDetails.length > 0 ? (
              <dl className="detail-grid">
                {candidateDetails.map((item) => (
                  <div key={item.label} className="detail-row">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="detail-empty">No personal details captured.</p>
            )}
          </div>

          {programmingLanguages.length > 0 && (
            <div className="detail-card">
              <h4>Programming Languages</h4>
              <ul className="bullet-list">
                {programmingLanguages.map((lang, index) => (
                  <li key={`lang-${index}`}>{lang}</li>
                ))}
              </ul>
            </div>
          )}

          {educationDetails.length > 0 && (
            <div className="detail-card">
              <h4>Education</h4>
              <ul className="bullet-list">
                {educationDetails.map((entry, index) => (
                  <li key={`edu-${index}`}>{entry}</li>
                ))}
              </ul>
            </div>
          )}

          {projectHasData && (
            <div className="detail-card">
              <h4>Recent Project</h4>
              {recentProject.name && (
                <p className="project-name">{recentProject.name}</p>
              )}
              {recentProject.description && (
                <p className="project-description">
                  {recentProject.description}
                </p>
              )}
              {toArray(recentProject.techStack).length > 0 && (
                <div className="project-tags">
                  {toArray(recentProject.techStack).map((tech, index) => (
                    <span className="tag" key={`tech-${index}`}>
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              {toArray(recentProject.confidenceSignals).length > 0 && (
                <ul className="bullet-list subtle">
                  {toArray(recentProject.confidenceSignals).map(
                    (signal, index) => (
                      <li key={`signal-${index}`}>{signal}</li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}

          {(callMeta.startedAt || callMeta.endedAt || durationText) && (
            <div className="detail-card">
              <h4>Session Meta</h4>
              <dl className="detail-grid">
                {callMeta.startedAt && (
                  <div className="detail-row">
                    <dt>Start</dt>
                    <dd>
                      {new Date(callMeta.startedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                )}
                {callMeta.endedAt && (
                  <div className="detail-row">
                    <dt>End</dt>
                    <dd>
                      {new Date(callMeta.endedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                )}
                {durationText && (
                  <div className="detail-row">
                    <dt>Duration</dt>
                    <dd>{durationText}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </aside>

        <div className="insights-column">
          <div className="radar-card">
            <div className="radar-header">
              <h3>Competency Radar</h3>
              <p>Normalised 0 – 100 scoring across core traits.</p>
            </div>
            <div className="radar-wrapper">
              {hasScoreData && radarData ? (
                <Radar data={radarData} options={radarOptions} />
              ) : (
                <div className="radar-placeholder">
                  <p>
                    No evaluation metrics returned. Update the VAPI prompt to
                    emit structured scores.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="insights-card">
            <h3>Insights & Next Steps</h3>
            <div className="insight-groups">
              {strengths.length > 0 && (
                <div className="insight-group">
                  <h4>Strengths</h4>
                  <ul className="bullet-list">
                    {strengths.map((item, index) => (
                      <li key={`strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {improvements.length > 0 && (
                <div className="insight-group">
                  <h4>Improvements</h4>
                  <ul className="bullet-list">
                    {improvements.map((item, index) => (
                      <li key={`improvement-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cautions.length > 0 && (
                <div className="insight-group">
                  <h4>Watch-outs</h4>
                  <ul className="bullet-list">
                    {cautions.map((item, index) => (
                      <li key={`caution-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {candidateQuestions.length > 0 && (
                <div className="insight-group">
                  <h4>Candidate Questions</h4>
                  <ul className="bullet-list subtle">
                    {candidateQuestions.map((item, index) => (
                      <li key={`question-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {followUpActions.length > 0 && (
                <div className="insight-group">
                  <h4>Suggested Follow-ups</h4>
                  <ul className="bullet-list subtle">
                    {followUpActions.map((item, index) => (
                      <li key={`follow-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notableQuotes.length > 0 && (
                <div className="insight-group quotes">
                  <h4>Notable Quotes</h4>
                  <ul className="quote-list">
                    {notableQuotes.map((item, index) => (
                      <li key={`quote-${index}`}>&ldquo;{item}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              )}

              {strengths.length === 0 &&
                improvements.length === 0 &&
                cautions.length === 0 &&
                followUpActions.length === 0 &&
                candidateQuestions.length === 0 &&
                notableQuotes.length === 0 && (
                  <p className="detail-empty">
                    Awaiting insights. Ensure the VAPI prompt provides takeaways
                    and actions.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>

      <footer className="result-footer">
        <button className="primary-button" onClick={onReset}>
          Start New Interview
        </button>
      </footer>
    </section>
  );
};

export default ResultSummary;

