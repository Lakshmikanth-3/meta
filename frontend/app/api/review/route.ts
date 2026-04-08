import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, filename, prTitle, prDesc } = body;

    const hfToken = process.env.HF_TOKEN;
    const apiBase = process.env.AI_API_BASE || "https://router.huggingface.co/v1";
    const model = process.env.AI_MODEL || "Qwen/Qwen2.5-72B-Instruct";

    if (!hfToken) {
      return NextResponse.json(
        { error: "HF_TOKEN not configured on server." },
        { status: 500 }
      );
    }

    const numbered = (code as string)
      .split("\n")
      .map((l: string, i: number) => `${String(i + 1).padStart(4, " ")} | ${l}`)
      .join("\n");

    const prompt = `You are an elite security engineer doing a critical production code review. Be exhaustive and precise. Every finding must cite the exact line number.

FILE: ${filename}
PR: ${prTitle || "Code Review"}
DESCRIPTION: ${prDesc || "(none)"}

CODE (line numbers prepended):
${numbered}

Scan for ALL of:
- SECURITY: sql_injection, auth_bypass, xss, csrf, path_traversal, ssrf, command_injection, exposed_secret, race_condition, insecure_deserialization, missing_auth, hardcoded_credentials
- LOGIC: off_by_one, null_check, logic_bug, wrong_operator, resource_leak, infinite_loop
- QUALITY: missing_validation, error_handling, style

Return ONLY valid JSON — zero markdown, zero preamble, zero trailing text:
{
  "language": "python",
  "findings": [
    {
      "line": 11,
      "severity": "critical",
      "type": "sql_injection",
      "comment": "User input directly interpolated into SQL via f-string. Attacker can exfiltrate entire DB.",
      "fix": "Use parameterised: db.execute('SELECT * FROM users WHERE name LIKE ?', ('%' + query + '%',))",
      "cwe": "CWE-89"
    }
  ],
  "verdict": "request_changes",
  "security_score": 12,
  "critical_count": 1,
  "warning_count": 2,
  "nit_count": 1,
  "summary": "Critical SQL injection vulnerability found. Immediate fix required before merge."
}

severity rules: critical = exploitable in production; warning = incorrect behaviour/potential exploit; nit = style/minor.
If code is clean: findings:[], verdict:"approve", security_score:95+.`;

    const res = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 3000,
        messages: [
          {
            role: "system",
            content:
              "You are a security code reviewer. Always respond with valid JSON only — no markdown, no preamble.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `AI API error ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid AI response format", raw: text },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
