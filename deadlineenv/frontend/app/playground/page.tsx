"use client";

// DeadlineEnv — Premium AI Code Security Reviewer
// Page 2: /playground — Full interactive reviewer dashboard
import { useState, useEffect, useRef } from "react";

// ─── helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const C = {
  bg: "#070a0d",
  surf: "#0d1117",
  surfAlt: "#111820",
  code: "#060809",
  border: "#1a2535",
  borderBright: "#2a3a55",
  green: "#00e676",
  red: "#ff4444",
  amber: "#ffb300",
  blue: "#4da6ff",
  purple: "#a78bff",
  cyan: "#00d4aa",
  greenDim: "#00e67640",
  redDim: "#ff444425",
  amberDim: "#ffb30020",
  blueDim: "#4da6ff18",
  tp: "#e6edf3",
  ts: "#6b7a99",
  tm: "#354060",
};

const SEV = {
  critical: { color: C.red, bg: C.redDim, icon: "⛔", label: "CRITICAL" },
  warning: { color: C.amber, bg: C.amberDim, icon: "⚠", label: "WARNING" },
  nit: { color: C.blue, bg: C.blueDim, icon: "💬", label: "NIT" },
};

const TYPE_MAP = {
  sql_injection: "SQL Injection",
  auth_bypass: "Auth Bypass",
  race_condition: "Race Condition",
  xss: "XSS",
  csrf: "CSRF",
  path_traversal: "Path Traversal",
  ssrf: "SSRF",
  command_injection: "Cmd Injection",
  exposed_secret: "Exposed Secret",
  off_by_one: "Off-by-one",
  null_check: "Null Check",
  logic_bug: "Logic Bug",
  style: "Style",
  missing_auth: "Missing Auth",
  hardcoded_credentials: "Hardcoded Creds",
  missing_validation: "Missing Validation",
  resource_leak: "Resource Leak",
  error_handling: "Error Handling",
  insecure_deserialization: "Insecure Deser.",
};

// ─── GitHub API helpers ───────────────────────────────────────────────────────
function parseGHUrl(url) {
  try {
    const clean = url
      .trim()
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\/$/, "");
    const parts = clean.split("/");
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    let branch = "main",
      filepath = "";
    if (parts[2] === "blob" && parts.length > 4) {
      branch = parts[3];
      filepath = parts.slice(4).join("/");
    } else if (parts[2] === "tree" && parts.length > 3) {
      branch = parts[3];
    }
    return { owner, repo, branch, filepath };
  } catch {
    return null;
  }
}

async function ghFetch(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok)
    throw new Error(
      res.status === 404
        ? "Repository not found. Make sure it is public."
        : res.status === 403
        ? "GitHub API rate limit. Wait 1 minute and try again."
        : `GitHub error ${res.status}`
    );
  return res.json();
}

async function fetchGHFile(owner, repo, branch, path) {
  const data = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
      path
    )}?ref=${branch}`
  );
  if (Array.isArray(data)) throw new Error("Path is a directory, select a file.");
  if (data.encoding === "base64") return atob(data.content.replace(/\n/g, ""));
  if (data.download_url) return (await fetch(data.download_url)).text();
  throw new Error("Cannot read file content.");
}

async function fetchGHTree(owner, repo, branch) {
  try {
    const data = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );
    return (data.tree || []).filter(
      (f) =>
        f.type === "blob" &&
        /\.(py|js|ts|jsx|tsx|go|java|rb|php|rs|cpp|c|cs|sh|yaml|yml|json)$/.test(
          f.path
        )
    );
  } catch {
    try {
      const data = await ghFetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`
      );
      return (data.tree || []).filter(
        (f) =>
          f.type === "blob" &&
          /\.(py|js|ts|jsx|tsx|go|java|rb|php|rs|cpp|c|cs|sh|yaml|yml|json)$/.test(
            f.path
          )
      );
    } catch {
      throw new Error("Could not read repository tree. Check the URL and branch.");
    }
  }
}

// ─── AI Review — proxied through /api/review to avoid CORS ──────────────────
async function callAIReview(code, filename, prTitle, prDesc) {
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, filename, prTitle, prDesc }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Review API error ${res.status}`);
  }

  return res.json();
}

// ─── Small components ─────────────────────────────────────────────────────────
function Badge({ label, color, bg, size = 10 }) {
  return (
    <span
      style={{
        background: bg || color + "25",
        color,
        fontSize: size,
        fontWeight: 700,
        fontFamily: "monospace",
        padding: "2px 7px",
        borderRadius: 4,
        letterSpacing: "0.8px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ScoreRing({ score }) {
  const r = 38,
    circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  const color = score >= 80 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={48} cy={48} r={r} fill="none" stroke={C.border} strokeWidth={6} />
      <circle
        cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x={48} y={52} textAnchor="middle" fill={color} fontSize={22} fontWeight={700} fontFamily="monospace">{score}</text>
      <text x={48} y={66} textAnchor="middle" fill={C.ts} fontSize={10} fontFamily="monospace">/100</text>
    </svg>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PlaygroundPage() {
  const [view, setView] = useState("input");
  const [inputTab, setInputTab] = useState("github");

  const [ghUrl, setGhUrl] = useState("");
  const [ghParsed, setGhParsed] = useState(null);
  const [ghFiles, setGhFiles] = useState([]);
  const [ghSelected, setGhSelected] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState("");

  const [pasteCode, setPasteCode] = useState("");
  const [pasteFile, setPasteFile] = useState("main.py");
  const [pastePrTitle, setPastePrTitle] = useState("");
  const [pastePrDesc, setPastePrDesc] = useState("");

  const [activeCode, setActiveCode] = useState("");
  const [activeFile, setActiveFile] = useState("");
  const [activeTitle, setActiveTitle] = useState("");
  const [activeDesc, setActiveDesc] = useState("");

  const [scanLog, setScanLog] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");

  const [result, setResult] = useState(null);
  const [visibleFindings, setVisibleFindings] = useState([]);
  const [verdictVisible, setVerdictVisible] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [reviewError, setReviewError] = useState("");

  const termRef = useRef(null);
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [scanLog, visibleFindings]);

  const codeRef = useRef(null);
  useEffect(() => {
    if (activeHighlight && codeRef.current) {
      const el = codeRef.current.querySelector(`[data-line="${activeHighlight}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeHighlight]);

  const addLog = (type, msg) =>
    setScanLog((prev) => [...prev, { type, msg, id: Date.now() + Math.random() }]);

  const handleGhFetch = async () => {
    const parsed = parseGHUrl(ghUrl);
    if (!parsed) {
      setGhError("Invalid URL. Use: https://github.com/owner/repo or .../blob/branch/file.py");
      return;
    }
    setGhError(""); setGhLoading(true); setGhFiles([]); setGhSelected(""); setGhParsed(parsed);
    try {
      if (parsed.filepath) {
        const code = await fetchGHFile(parsed.owner, parsed.repo, parsed.branch, parsed.filepath);
        setActiveCode(code);
        setActiveFile(parsed.filepath.split("/").pop());
        setActiveTitle(`${parsed.owner}/${parsed.repo}: ${parsed.filepath}`);
        setGhFiles([{ path: parsed.filepath }]);
        setGhSelected(parsed.filepath);
      } else {
        const files = await fetchGHTree(parsed.owner, parsed.repo, parsed.branch);
        setGhFiles(files);
        if (!files.length) setGhError("No reviewable code files found in this repository.");
      }
    } catch (e) { setGhError(e.message); }
    setGhLoading(false);
  };

  const handleGhFileSelect = async (path) => {
    if (!ghParsed) return;
    setGhSelected(path); setGhLoading(true); setGhError("");
    try {
      const branch = ghParsed.branch || "main";
      const code = await fetchGHFile(ghParsed.owner, ghParsed.repo, branch, path);
      setActiveCode(code);
      setActiveFile(path.split("/").pop());
      setActiveTitle(`${ghParsed.owner}/${ghParsed.repo}: ${path}`);
    } catch (e) { setGhError(e.message); }
    setGhLoading(false);
  };

  const startReview = async (code, filename, title, desc = "") => {
    if (!code.trim()) return;
    setActiveCode(code); setActiveFile(filename); setActiveTitle(title); setActiveDesc(desc);
    setView("scanning"); setScanLog([]); setScanProgress(0); setResult(null);
    setVisibleFindings([]); setVerdictVisible(false); setReviewError("");

    const lines = code.split("\n");
    addLog("sys", `[DeadlineEnv] Security scanner v2.4 initialised`);
    addLog("sys", `[DeadlineEnv] Target: ${filename} (${lines.length} lines)`);
    await sleep(250);
    addLog("sys", `[DeadlineEnv] Loading ruleset: OWASP Top 10 + CWE Top 25`);
    await sleep(200);
    addLog("sys", `[DeadlineEnv] Patterns: sql_injection, auth_bypass, race_condition, xss, ssrf, rce...`);
    await sleep(200);
    setScanStatus("Scanning source code...");

    const reviewPromise = callAIReview(code, filename, title, desc);

    const totalLines = lines.length;
    const logEvery = Math.max(1, Math.floor(totalLines / 10));
    for (let i = 0; i < totalLines; i++) {
      await sleep(Math.max(8, 800 / totalLines));
      setScanProgress(Math.round((i / totalLines) * 80));
      if (i % logEvery === 0 && lines[i].trim()) {
        addLog("scan", `[${String(i + 1).padStart(4, "0")}] ${lines[i].trim().slice(0, 60)}${lines[i].trim().length > 60 ? "…" : ""}`);
      }
    }

    setScanStatus("Running AI security analysis...");
    addLog("sys", "[DeadlineEnv] Sending to AI analysis engine...");
    setScanProgress(85);

    let reviewResult;
    try { reviewResult = await reviewPromise; }
    catch (e) { setReviewError(e.message); setView("input"); return; }

    setScanProgress(100);
    setScanStatus("Analysis complete");
    const n = reviewResult.findings?.length || 0;
    addLog("sys", `[DeadlineEnv] Analysis complete. ${n} issue${n !== 1 ? "s" : ""} found.`);
    addLog("sys", `[DeadlineEnv] Verdict: ${reviewResult.verdict?.toUpperCase() || "UNKNOWN"} | Score: ${reviewResult.security_score}/100`);
    await sleep(600);

    setResult(reviewResult);
    setView("results");

    for (const finding of reviewResult.findings || []) {
      await sleep(500);
      setVisibleFindings((prev) => [...prev, finding]);
      setActiveHighlight(finding.line);
      await sleep(350);
    }
    setActiveHighlight(null);
    await sleep(400);
    setVerdictVisible(true);
  };

  const handleSubmit = () => {
    if (inputTab === "paste") startReview(pasteCode, pasteFile, pastePrTitle || "Code Review", pastePrDesc);
    else if (activeCode) startReview(activeCode, activeFile, activeTitle, activeDesc);
  };

  const reset = () => {
    setView("input"); setResult(null); setScanLog([]); setGhFiles([]);
    setGhSelected(""); setGhUrl(""); setGhParsed(null); setGhError("");
    setActiveCode(""); setVisibleFindings([]); setVerdictVisible(false);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.tp, fontFamily: "Inter, system-ui, sans-serif", fontSize: 13 }}>

      {/* Sub-header for this page */}
      <div style={{ background: C.surf, borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", color: C.green, fontSize: 10, background: "#00e67618", padding: "2px 8px", borderRadius: 4, letterSpacing: "1px" }}>SECURITY REVIEW</span>
          {view !== "input" && <span style={{ fontFamily: "monospace", fontSize: 11, color: C.ts }}>› {activeFile}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {view !== "input" && (
            <button onClick={reset} style={{ background: "transparent", color: C.ts, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
              ← New Review
            </button>
          )}
          <span style={{ color: C.ts, fontSize: 11, fontFamily: "monospace" }}>OpenEnv Hackathon</span>
        </div>
      </div>

      {/* ═══════════════ INPUT VIEW ═══════════════ */}
      {view === "input" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: "monospace", color: C.ts, fontSize: 11, marginBottom: 8 }}>// AI-powered code security review</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.8px" }}>Review code before it ships</h1>
            <p style={{ color: C.ts, lineHeight: 1.7, maxWidth: 560 }}>
              Paste code or connect a GitHub repo. DeadlineEnv scans every line for security vulnerabilities, logic bugs, and code quality issues — then delivers a verdict.
            </p>
          </div>

          {reviewError && (
            <div style={{ background: C.redDim, border: `1px solid ${C.red}40`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontFamily: "monospace", fontSize: 12, color: C.red }}>
              ⛔ {reviewError}
            </div>
          )}

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 24, width: "fit-content" }}>
            {[["github", "⑂ GitHub Repo"], ["paste", "⌨ Paste Code"]].map(([id, label]) => (
              <button key={id} onClick={() => setInputTab(id)}
                style={{ background: inputTab === id ? C.surfAlt : "transparent", color: inputTab === id ? C.tp : C.ts, border: "none", borderRight: id === "github" ? `1px solid ${C.border}` : "none", cursor: "pointer", padding: "9px 22px", fontSize: 13, fontWeight: inputTab === id ? 600 : 400, transition: ".15s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* GitHub Tab */}
          {inputTab === "github" && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
              <div style={{ fontFamily: "monospace", color: C.ts, fontSize: 11, marginBottom: 14 }}>// connect a public GitHub repository</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input value={ghUrl} onChange={(e) => setGhUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGhFetch()}
                  placeholder="https://github.com/owner/repo  or  …/blob/main/path/to/file.py"
                  style={{ flex: 1, background: C.code, border: `1px solid ${C.borderBright}`, borderRadius: 6, color: C.tp, padding: "9px 12px", fontSize: 12, fontFamily: "monospace" }} />
                <button onClick={handleGhFetch} disabled={ghLoading || !ghUrl.trim()}
                  style={{ background: ghLoading ? C.tm : C.green, color: "#070a0d", border: "none", borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: ghLoading ? "wait" : "pointer", whiteSpace: "nowrap", opacity: !ghUrl.trim() ? 0.5 : 1 }}>
                  {ghLoading ? "…" : "→ Fetch"}
                </button>
              </div>

              {ghError && (
                <div style={{ background: C.redDim, border: `1px solid ${C.red}40`, borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontFamily: "monospace", fontSize: 12, color: C.red }}>
                  ⛔ {ghError}
                </div>
              )}

              {ghFiles.length > 0 && (
                <div>
                  <div style={{ color: C.ts, fontSize: 11, fontFamily: "monospace", marginBottom: 8 }}>
                    {ghFiles.length === 1 ? "File ready to review:" : `Select a file to review (${ghFiles.length} code files found):`}
                  </div>
                  <div style={{ background: C.code, border: `1px solid ${C.border}`, borderRadius: 6, maxHeight: 220, overflowY: "auto" }}>
                    {ghFiles.slice(0, 60).map((f) => (
                      <div key={f.path} onClick={() => handleGhFileSelect(f.path)}
                        style={{ padding: "7px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: ghSelected === f.path ? "#00e67610" : "transparent", borderLeft: `3px solid ${ghSelected === f.path ? C.green : "transparent"}`, transition: ".1s", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: C.ts, fontFamily: "monospace", fontSize: 10 }}>
                          {f.path.endsWith(".py") ? "🐍" : f.path.endsWith(".js") || f.path.endsWith(".ts") ? "📜" : f.path.endsWith(".go") ? "🔵" : "📄"}
                        </span>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: ghSelected === f.path ? C.green : C.tp }}>{f.path}</span>
                        {ghSelected === f.path && <span style={{ marginLeft: "auto", color: C.green, fontSize: 10 }}>✓ selected</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCode && ghSelected && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: C.ts }}>{activeFile} · {activeCode.split("\n").length} lines</span>
                    <Badge label="READY TO REVIEW" color={C.green} size={10} />
                  </div>
                  <div style={{ background: C.code, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", maxHeight: 160, overflowY: "auto", fontFamily: "monospace", fontSize: 11.5, color: C.ts, lineHeight: 1.6 }}>
                    {activeCode.split("\n").slice(0, 20).map((l, i) => (
                      <div key={i}><span style={{ color: C.tm, paddingRight: 12, userSelect: "none" }}>{i + 1}</span>{l}</div>
                    ))}
                    {activeCode.split("\n").length > 20 && <div style={{ color: C.tm, paddingTop: 4 }}>… {activeCode.split("\n").length - 20} more lines</div>}
                  </div>
                </div>
              )}

              <button onClick={handleSubmit} disabled={!activeCode}
                style={{ marginTop: 20, background: activeCode ? C.green : C.tm, color: activeCode ? "#070a0d" : C.ts, border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: activeCode ? "pointer" : "not-allowed", width: "100%", letterSpacing: "0.3px" }}>
                {activeCode ? `⚡ Run Security Review — ${activeCode.split("\n").length} lines` : "Select a file first"}
              </button>
            </div>
          )}

          {/* Paste Tab */}
          {inputTab === "paste" && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
              <div style={{ fontFamily: "monospace", color: C.ts, fontSize: 11, marginBottom: 16 }}>// paste code to review</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ color: C.ts, fontSize: 11, display: "block", marginBottom: 5 }}>PR Title</label>
                  <input value={pastePrTitle} onChange={(e) => setPastePrTitle(e.target.value)} placeholder="e.g. Fix authentication vulnerability"
                    style={{ width: "100%", background: C.code, border: `1px solid ${C.borderBright}`, borderRadius: 6, color: C.tp, padding: "8px 10px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: C.ts, fontSize: 11, display: "block", marginBottom: 5 }}>Filename</label>
                  <input value={pasteFile} onChange={(e) => setPasteFile(e.target.value)} placeholder="main.py"
                    style={{ width: "100%", background: C.code, border: `1px solid ${C.borderBright}`, borderRadius: 6, color: C.tp, padding: "8px 10px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: C.ts, fontSize: 11, display: "block", marginBottom: 5 }}>PR Description (optional)</label>
                <input value={pastePrDesc} onChange={(e) => setPastePrDesc(e.target.value)} placeholder="What does this PR change?"
                  style={{ width: "100%", background: C.code, border: `1px solid ${C.borderBright}`, borderRadius: 6, color: C.tp, padding: "8px 10px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: C.ts, fontSize: 11, display: "block", marginBottom: 5 }}>
                  Code — paste the full file or diff &nbsp;
                  <span style={{ color: C.tm }}>({pasteCode.split("\n").filter(Boolean).length} lines)</span>
                </label>
                <textarea value={pasteCode} onChange={(e) => setPasteCode(e.target.value)}
                  placeholder={"def search_users():\n    query = request.args.get('q')\n    db.execute(f\"SELECT * FROM users WHERE name LIKE '%{query}%'\")\n    # paste your code here..."}
                  rows={14}
                  style={{ width: "100%", background: C.code, border: `1px solid ${C.borderBright}`, borderRadius: 6, color: C.tp, padding: "12px 14px", fontSize: 12, fontFamily: "monospace", resize: "vertical", lineHeight: 1.65, boxSizing: "border-box" }} />
              </div>
              <button onClick={handleSubmit} disabled={!pasteCode.trim()}
                style={{ background: pasteCode.trim() ? C.green : C.tm, color: pasteCode.trim() ? "#070a0d" : C.ts, border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: pasteCode.trim() ? "pointer" : "not-allowed", width: "100%" }}>
                {pasteCode.trim() ? `⚡ Run Security Review — ${pasteCode.split("\n").length} lines` : "Paste code first"}
              </button>
            </div>
          )}

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", marginBottom: 32 }}>
            {["OWASP Top 10", "CWE Top 25", "SQL Injection", "Auth Bypass", "Race Conditions", "Logic Bugs", "Exposed Secrets", "Line-by-line execution"].map((tag) => (
              <span key={tag} style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, color: C.ts, fontFamily: "monospace" }}>{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ SCANNING VIEW ═══════════════ */}
      {view === "scanning" && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "monospace", color: C.blue, fontSize: 11 }}>{activeFile}</span>
                <span style={{ marginLeft: "auto" }}><Badge label="SCANNING" color={C.green} bg={C.greenDim} /></span>
              </div>
              <div style={{ position: "relative", maxHeight: 420, overflowY: "hidden" }}>
                <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: C.green, boxShadow: `0 0 12px ${C.green}`, top: `${scanProgress}%`, transition: "top 0.3s ease", zIndex: 5 }} />
                <div style={{ padding: "8px 0", fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.7 }}>
                  {activeCode.split("\n").map((line, i) => {
                    const pct = (i / activeCode.split("\n").length) * 100;
                    const scanned = pct < scanProgress;
                    return (
                      <div key={i} style={{ display: "flex", background: scanned ? "#00e67606" : "transparent", transition: "background .3s" }}>
                        <span style={{ color: scanned ? C.green : C.tm, minWidth: 38, textAlign: "right", paddingRight: 10, paddingLeft: 8, fontSize: 11, userSelect: "none", opacity: scanned ? 1 : 0.4 }}>{i + 1}</span>
                        <span style={{ color: scanned ? C.tp : C.tm, paddingRight: 12, whiteSpace: "pre", opacity: scanned ? 1 : 0.3 }}>{line || " "}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: C.green, width: `${scanProgress}%`, transition: "width .3s", borderRadius: 2 }} />
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: C.ts }}>{scanStatus}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: C.green }}>{scanProgress}%</span>
                </div>
              </div>
            </div>

            <div style={{ background: C.code, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", color: C.green, fontSize: 11 }}>// execution log</span>
                <span style={{ marginLeft: "auto", width: 8, height: 8, background: C.green, borderRadius: "50%", animation: "pulse 1s infinite" }} />
              </div>
              <div ref={termRef} style={{ flex: 1, overflowY: "auto", padding: "10px 0", maxHeight: 380, minHeight: 200 }}>
                {scanLog.map((entry, idx) => (
                  <div key={idx} style={{ padding: "1px 14px", fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.7, color: entry.type === "sys" ? C.green : entry.type === "scan" ? C.ts : C.tp }}>
                    {entry.msg}
                  </div>
                ))}
                <div style={{ padding: "1px 14px", fontFamily: "monospace", fontSize: 11.5, color: C.green }}>
                  <span style={{ animation: "blink 1s step-end infinite" }}>█</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", color: C.ts, fontSize: 12, fontFamily: "monospace" }}>
            DeadlineEnv AI Security Scanner · {activeCode.split("\n").length} lines · Real-time analysis
          </div>
        </div>
      )}

      {/* ═══════════════ RESULTS VIEW ═══════════════ */}
      {view === "results" && result && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 0, height: "calc(100vh - 94px)", overflow: "hidden" }}>
          {/* Left: annotated code */}
          <div style={{ overflow: "auto", borderRight: `1px solid ${C.border}` }} ref={codeRef}>
            <div style={{ position: "sticky", top: 0, background: C.surf, borderBottom: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
              <span style={{ fontFamily: "monospace", color: C.blue, fontSize: 12 }}>{activeFile}</span>
              <span style={{ color: C.ts, fontSize: 11 }}>· {activeCode.split("\n").length} lines</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {result.critical_count > 0 && <Badge label={`${result.critical_count} CRITICAL`} color={C.red} />}
                {result.warning_count > 0 && <Badge label={`${result.warning_count} WARNING`} color={C.amber} />}
                {result.nit_count > 0 && <Badge label={`${result.nit_count} NIT`} color={C.blue} />}
              </span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.7 }}>
              {activeCode.split("\n").map((line, i) => {
                const lineNum = i + 1;
                const lineFindings = visibleFindings.filter((f) => f.line === lineNum);
                const isHighlighted = activeHighlight === lineNum;
                const worstSev = lineFindings.find((f) => f.severity === "critical") ? "critical" : lineFindings.find((f) => f.severity === "warning") ? "warning" : lineFindings.length ? "nit" : null;
                const sevCfg = worstSev ? SEV[worstSev] : null;
                return (
                  <div key={i} data-line={lineNum}>
                    <div style={{ display: "flex", alignItems: "stretch", minHeight: 22, background: isHighlighted ? "#4da6ff18" : sevCfg ? sevCfg.bg : "transparent", borderLeft: `3px solid ${isHighlighted ? C.blue : sevCfg ? sevCfg.color : "transparent"}`, transition: "background .3s, border-left .3s" }}>
                      <span style={{ color: C.tm, minWidth: 42, textAlign: "right", paddingRight: 12, paddingLeft: 8, fontSize: 11, userSelect: "none", lineHeight: "22px" }}>{lineNum}</span>
                      <span style={{ flex: 1, paddingRight: 16, color: sevCfg ? (worstSev === "critical" ? "#ffaaaa" : worstSev === "warning" ? "#ffe08a" : C.tp) : C.tp, whiteSpace: "pre" }}>{line || " "}</span>
                      {sevCfg && <span style={{ paddingRight: 10, fontSize: 13, lineHeight: "22px" }}>{sevCfg.icon}</span>}
                    </div>
                    {lineFindings.map((f, fi) => {
                      const fc = SEV[f.severity] || SEV.nit;
                      return (
                        <div key={fi} style={{ margin: "4px 16px 8px 52px", background: fc.bg, border: `1px solid ${fc.color}40`, borderRadius: 6, padding: "8px 12px", fontSize: 11.5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <Badge label={fc.label} color={fc.color} size={10} />
                            <Badge label={TYPE_MAP[f.type] || f.type} color={fc.color} bg="transparent" size={10} />
                            {f.cwe && <Badge label={f.cwe} color={C.purple} size={10} />}
                            <span style={{ marginLeft: "auto", color: C.ts, fontFamily: "monospace", fontSize: 10 }}>line {f.line}</span>
                          </div>
                          <div style={{ color: C.tp, lineHeight: 1.6, marginBottom: 6 }}>{f.comment}</div>
                          {f.fix && (
                            <div style={{ background: "#00e67610", border: `1px solid ${C.green}30`, borderRadius: 4, padding: "6px 10px", fontFamily: "monospace", fontSize: 11, color: C.green, lineHeight: 1.6 }}>
                              ✓ Fix: {f.fix}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: findings panel */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: C.surf }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ScoreRing score={result.security_score} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.ts, fontSize: 11, marginBottom: 4 }}>Security Score</div>
                  {verdictVisible && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: result.verdict === "approve" ? "#00e67620" : "#ff444420", border: `1px solid ${result.verdict === "approve" ? C.green : C.red}50`, borderRadius: 6, padding: "6px 14px", marginBottom: 8 }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: result.verdict === "approve" ? C.green : C.red }}>
                        {result.verdict === "approve" ? "✓ APPROVED" : "✕ REQUEST CHANGES"}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {result.critical_count > 0 && <span style={{ fontFamily: "monospace", fontSize: 11, color: C.red }}>⛔ {result.critical_count} critical</span>}
                    {result.warning_count > 0 && <span style={{ fontFamily: "monospace", fontSize: 11, color: C.amber }}>⚠ {result.warning_count} warning</span>}
                    {result.nit_count > 0 && <span style={{ fontFamily: "monospace", fontSize: 11, color: C.blue }}>💬 {result.nit_count} nit</span>}
                    {result.findings?.length === 0 && <span style={{ fontFamily: "monospace", fontSize: 11, color: C.green }}>✓ No issues</span>}
                  </div>
                </div>
              </div>
              
              {/* Simulated RL Reward Output */}
              {verdictVisible && (
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>RL Points Gained</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: '#4ade80' }}>
                      💎 +{((result.findings?.length || 0) * 0.75 + (result.verdict === 'approve' ? 0.4 : 0.6)).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>RL Penalties</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold', color: '#f87171' }}>
                      ⏱ -{(((result.findings?.length || 0) + 1) * 0.02).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {result.summary && verdictVisible && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: C.code, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.ts, lineHeight: 1.65 }}>
                  {result.summary}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflow: "auto" }} ref={termRef}>
              <div style={{ padding: "10px 16px 6px", fontFamily: "monospace", color: C.ts, fontSize: 10, letterSpacing: ".5px", position: "sticky", top: 0, background: C.surf, borderBottom: `1px solid ${C.border}` }}>
                // findings ({visibleFindings.length}/{result.findings?.length || 0})
              </div>
              {visibleFindings.length === 0 && (
                <div style={{ padding: "20px 16px", fontFamily: "monospace", fontSize: 12, color: C.tm }}>Analyzing…</div>
              )}
              {visibleFindings.map((f, i) => {
                const fc = SEV[f.severity] || SEV.nit;
                return (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: ".15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.surfAlt; setActiveHighlight(f.line); }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; setActiveHighlight(null); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: C.tm }}>line {f.line}</span>
                      <Badge label={fc.label} color={fc.color} size={9} />
                      <Badge label={TYPE_MAP[f.type] || f.type} color={fc.color} bg="transparent" size={9} />
                      {f.cwe && <Badge label={f.cwe} color={C.purple} size={9} />}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, color: C.ts, lineHeight: 1.6, marginBottom: 4 }}>{f.comment}</div>
                    {f.fix && <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>→ {f.fix.slice(0, 80)}{f.fix.length > 80 ? "…" : ""}</div>}
                  </div>
                );
              })}
              {verdictVisible && result.findings?.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: C.green }}>
                  ✓ No security issues found<br />
                  <span style={{ color: C.ts, fontSize: 11 }}>Code looks safe to merge</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px" }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.tm, marginBottom: 4 }}>{activeTitle}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={reset} style={{ flex: 1, background: "transparent", color: C.ts, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 0", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
                  ← New Review
                </button>
                <button onClick={() => { const blob = new Blob([JSON.stringify({ file: activeFile, ...result }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `review-${activeFile}.json`; a.click(); }}
                  style={{ flex: 1, background: C.surfAlt, color: C.blue, border: `1px solid ${C.borderBright}`, borderRadius: 6, padding: "7px 0", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>
                  ↓ Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      `}</style>
    </div>
  );
}
