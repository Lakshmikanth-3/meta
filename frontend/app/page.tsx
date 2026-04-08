"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const FEATURES = [
  {
    icon: "⛔",
    title: "OWASP Top 10",
    desc: "SQL injection, XSS, CSRF, SSRF, path traversal and more — all caught automatically.",
  },
  {
    icon: "🔍",
    title: "Line-by-line Execution",
    desc: "Every line of code is stepped through and scanned against a live security ruleset.",
  },
  {
    icon: "🤖",
    title: "AI Security Engine",
    desc: "Powered by Claude — the model explains each finding and provides an exact fix.",
  },
  {
    icon: "📄",
    title: "GitHub Native",
    desc: "Paste a repo URL or a direct file blob link and get a full audit in seconds.",
  },
  {
    icon: "⚠",
    title: "CWE Top 25",
    desc: "Catches logic bugs, auth bypasses, race conditions and resource leaks too.",
  },
  {
    icon: "✅",
    title: "Instant Verdict",
    desc: "Each review ends with a security score and a clear APPROVE / REQUEST CHANGES verdict.",
  },
];

const TICKER = [
  "SQL Injection",
  "Auth Bypass",
  "Race Conditions",
  "XSS",
  "CSRF",
  "Exposed Secrets",
  "Logic Bugs",
  "Path Traversal",
  "SSRF",
  "CWE Top 25",
  "OWASP Top 10",
];

const DEMO_LINES = [
  { n: 1,  code: "def search_users():",                                       sev: null },
  { n: 2,  code: "    query = request.args.get('q')",                         sev: null },
  { n: 3,  code: "    db.execute(f\"SELECT * FROM users WHERE name LIKE '%{query}%'\")", sev: "critical" },
  { n: 4,  code: "    return db.fetchall()",                                  sev: null },
  { n: 5,  code: "",                                                           sev: null },
  { n: 6,  code: "def get_user(user_id):",                                    sev: null },
  { n: 7,  code: "    # TODO: add auth check",                                sev: "warning" },
  { n: 8,  code: "    return db.query('SELECT * FROM users WHERE id=?', user_id)", sev: null },
  { n: 9,  code: "",                                                           sev: null },
  { n: 10, code: "SECRET_KEY = 'my-secret-key-123'",                          sev: "critical" },
];

const SEV_COLOR = {
  critical: { bg: "#ff444420", border: "#ff444440", dot: "#ff4444", icon: "⛔" },
  warning:  { bg: "#ffb30015", border: "#ffb30035", dot: "#ffb300", icon: "⚠" },
};

export default function LandingPage() {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [typed, setTyped] = useState("");
  const fullText = "Review code before it ships";

  // Hero typewriter
  useEffect(() => {
    if (typed.length < fullText.length) {
      const t = setTimeout(() => setTyped(fullText.slice(0, typed.length + 1)), 55);
      return () => clearTimeout(t);
    }
  }, [typed]);

  // Ticker
  useEffect(() => {
    const t = setInterval(() => setTickerIdx((i) => (i + 1) % TICKER.length), 2000);
    return () => clearInterval(t);
  }, []);

  // Demo scan animation
  useEffect(() => {
    const t = setInterval(() => setScanLine((l) => (l + 1) % (DEMO_LINES.length + 3)), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        background: "#070a0d",
        minHeight: "100vh",
        color: "#e6edf3",
        fontFamily: "Inter, system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          minHeight: "92vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
          overflow: "hidden",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse, #00e67618 0%, #4da6ff0a 50%, transparent 80%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            maxWidth: 1100,
            width: "100%",
            position: "relative",
            zIndex: 1,
            alignItems: "center",
          }}
        >
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#00e67612",
                border: "1px solid #00e67630",
                borderRadius: 20,
                padding: "5px 14px",
                marginBottom: 28,
              }}
            >
              <span
                style={{ width: 6, height: 6, background: "#00e676", borderRadius: "50%", animation: "pulse 1.5s infinite" }}
              />
              <span
                style={{ fontFamily: "monospace", fontSize: 11, color: "#00e676", letterSpacing: "1px" }}
              >
                AI-POWERED · REAL-TIME · LINE-BY-LINE
              </span>
            </div>

            <h1
              style={{
                fontSize: 48,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
                margin: "0 0 24px",
                minHeight: 110,
              }}
            >
              {typed}
              <span style={{ color: "#00e676", animation: "blink 1s step-end infinite" }}>|</span>
            </h1>

            <p
              style={{
                color: "#6b7a99",
                fontSize: 16,
                lineHeight: 1.8,
                maxWidth: 440,
                marginBottom: 40,
              }}
            >
              Paste code or connect a GitHub repo. DeadlineEnv scans every line
              for security vulnerabilities, logic bugs, and code quality issues —
              then delivers a verdict with exact fixes.
            </p>

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link
                href="/playground"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#00e676",
                  color: "#070a0d",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "13px 28px",
                  borderRadius: 9,
                  textDecoration: "none",
                  transition: "transform .15s, box-shadow .15s",
                  boxShadow: "0 0 24px #00e67630",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 0 40px #00e67650";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 0 24px #00e67630";
                }}
              >
                ⚡ Start Reviewing
              </Link>
              <a
                href="https://github.com/huggingface/open-env"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  color: "#6b7a99",
                  fontWeight: 500,
                  fontSize: 15,
                  padding: "13px 28px",
                  borderRadius: 9,
                  textDecoration: "none",
                  border: "1px solid #1a2535",
                  transition: "color .15s, border-color .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#e6edf3";
                  e.currentTarget.style.borderColor = "#2a3a55";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#6b7a99";
                  e.currentTarget.style.borderColor = "#1a2535";
                }}
              >
                ⑂ View on GitHub
              </a>
            </div>

            {/* Rolling ticker */}
            <div
              style={{
                marginTop: 40,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#354060" }}>
                Detects:
              </span>
              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid #1a2535",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#00e676",
                  minWidth: 160,
                  textAlign: "center",
                  transition: "all .3s",
                }}
              >
                {TICKER[tickerIdx]}
              </div>
            </div>
          </div>

          {/* Right: animated demo code window */}
          <div
            style={{
              background: "#0d1117",
              border: "1px solid #1a2535",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 0 60px #00000060, 0 0 0 1px #1a253550",
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #1a2535",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#0a0f14",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                ))}
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#354060", flex: 1, textAlign: "center" }}>
                auth.py — DeadlineEnv Security Scan
              </span>
              <span
                style={{
                  background: "#00e67618",
                  color: "#00e676",
                  fontFamily: "monospace",
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: 4,
                  letterSpacing: "1px",
                  animation: "pulse 1.5s infinite",
                }}
              >
                SCANNING
              </span>
            </div>

            {/* Code lines */}
            <div style={{ padding: "12px 0", fontFamily: "monospace", fontSize: 12.5, lineHeight: 1.75 }}>
              {DEMO_LINES.map((line, i) => {
                const scanned = i < scanLine;
                const sevCfg = line.sev ? SEV_COLOR[line.sev] : null;
                return (
                  <div key={i}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: sevCfg && scanned ? sevCfg.bg : scanned ? "#00e67605" : "transparent",
                        borderLeft: `3px solid ${sevCfg && scanned ? sevCfg.dot : scanned ? "#00e67640" : "transparent"}`,
                        transition: "background .4s, border-left .4s",
                        minHeight: 22,
                      }}
                    >
                      <span
                        style={{
                          color: scanned ? (sevCfg ? sevCfg.dot : "#00e676") : "#354060",
                          minWidth: 40,
                          textAlign: "right",
                          paddingRight: 12,
                          paddingLeft: 8,
                          fontSize: 11,
                          userSelect: "none",
                          opacity: scanned ? 1 : 0.4,
                          transition: "color .4s, opacity .4s",
                        }}
                      >
                        {line.n}
                      </span>
                      <span
                        style={{
                          color: scanned
                            ? sevCfg
                              ? line.sev === "critical"
                                ? "#ffaaaa"
                                : "#ffe08a"
                              : "#e6edf3"
                            : "#354060",
                          paddingRight: 12,
                          whiteSpace: "pre",
                          opacity: scanned ? 1 : 0.3,
                          transition: "color .4s, opacity .4s",
                          flex: 1,
                        }}
                      >
                        {line.code || " "}
                      </span>
                      {sevCfg && scanned && (
                        <span style={{ paddingRight: 10, fontSize: 13 }}>{sevCfg.icon}</span>
                      )}
                    </div>
                    {/* Finding bubble */}
                    {sevCfg && scanned && (
                      <div
                        style={{
                          margin: "3px 14px 6px 50px",
                          background: sevCfg.bg,
                          border: `1px solid ${sevCfg.border}`,
                          borderRadius: 5,
                          padding: "6px 10px",
                          fontSize: 11,
                          color: "#e6edf3",
                          lineHeight: 1.5,
                          animation: "fadeIn .4s ease",
                        }}
                      >
                        <span style={{ color: sevCfg.dot, fontWeight: 700, marginRight: 6, fontFamily: "monospace", fontSize: 10 }}>
                          {line.sev === "critical" ? "⛔ CRITICAL" : "⚠ WARNING"}
                        </span>
                        {line.sev === "critical" && line.n === 3
                          ? "SQL injection via f-string interpolation"
                          : line.sev === "critical" && line.n === 10
                          ? "Hardcoded secret key exposed in source"
                          : "Missing authentication check before data access"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Score bar */}
            <div
              style={{
                borderTop: "1px solid #1a2535",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#0a0f14",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6b7a99" }}>Security Score</span>
                <div style={{ width: 120, height: 4, background: "#1a2535", borderRadius: 2, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (scanLine / DEMO_LINES.length) * 100)}%`,
                      background: "#ff4444",
                      borderRadius: 2,
                      transition: "width .4s",
                    }}
                  />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#ff4444" }}>24/100</span>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 10,
                  background: "#ff444420",
                  color: "#ff4444",
                  border: "1px solid #ff444440",
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                ✕ REQUEST CHANGES
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "60px 24px 80px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#354060",
              letterSpacing: "2px",
              marginBottom: 12,
            }}
          >
            // what we catch
          </div>
          <h2
            style={{
              fontSize: 30,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.8px",
            }}
          >
            Security without compromise
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#0d1117",
                border: "1px solid #1a2535",
                borderRadius: 12,
                padding: "24px 22px",
                transition: "border-color .2s, transform .2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#00e67630";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1a2535";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 8,
                  color: "#e6edf3",
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "#6b7a99", lineHeight: 1.65 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section
        style={{
          borderTop: "1px solid #1a2535",
          padding: "80px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 250,
            background:
              "radial-gradient(ellipse, #00e67612 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "#354060",
            letterSpacing: "2px",
            marginBottom: 16,
          }}
        >
          // ready to review
        </div>
        <h2
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "-1px",
            margin: "0 0 14px",
          }}
        >
          Ship code you can trust
        </h2>
        <p style={{ color: "#6b7a99", fontSize: 15, marginBottom: 36 }}>
          Scan any file. Catch every vulnerability. Get exact fixes.
        </p>
        <Link
          href="/playground"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#00e676",
            color: "#070a0d",
            fontWeight: 700,
            fontSize: 16,
            padding: "15px 36px",
            borderRadius: 10,
            textDecoration: "none",
            boxShadow: "0 0 32px #00e67635",
            transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 0 52px #00e67655";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0 32px #00e67635";
          }}
        >
          ⚡ Open Security Reviewer →
        </Link>
        <div
          style={{
            marginTop: 40,
            fontFamily: "monospace",
            fontSize: 11,
            color: "#354060",
          }}
        >
          OpenEnv Hackathon · DeadlineEnv v2.4
        </div>
      </section>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1a2535; border-radius: 2px; }
      `}</style>
    </div>
  );
}
