TASK = {
    "task_id": "hard-007",
    "pr_title": "Add system diagnostics endpoint for ops team",
    "pr_description": "New /admin/diag endpoint runs system commands and returns output. Debug endpoint left accessible.",
    "max_steps_override": 12,
    "diffs": [
        {
            "filename": "routes/admin.py",
            "language": "python",
            "lines": [
                "import subprocess",
                "from flask import Blueprint, request, jsonify",
                "",
                "admin_bp = Blueprint('admin', __name__)",
                "",
                "@admin_bp.route('/admin/diag')",
                "def run_diag():",
                "    cmd = request.args.get('cmd', 'uptime')",
                "    output = subprocess.check_output(cmd, shell=True, text=True)",
                "    return jsonify({'output': output})",
                "",
                "@admin_bp.route('/debug/vars')",
                "def debug_vars():",
                "    import os",
                "    return jsonify(dict(os.environ))",
            ],
            "changed_line_numbers": [8, 9, 12],
        },
        {
            "filename": "middleware/sanitise.py",
            "language": "python",
            "lines": [
                "def sanitise_output(text, max_length=1000):",
                "    return text[:max_length]",
            ],
            "changed_line_numbers": [2],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 9,
            "severity": "critical",
            "description": "Command injection vulnerability: user input from request.args is passed to subprocess with shell=True. An attacker can append semicolons or pipes to run arbitrary OS commands (e.g. cmd=uptime;cat+/etc/passwd).",
            "file": "routes/admin.py",
        },
        {
            "line": 12,
            "severity": "critical",
            "description": "Debug endpoint left in production: /debug/vars dumps all environment variables including secrets, database URLs, and API keys. This endpoint must be removed or guarded behind authentication before deployment.",
            "file": "routes/admin.py",
        },
        {
            "line": 2,
            "severity": "nit",
            "description": "Output truncation is silent: sanitise_output truncates without indicating to the caller that the output was cut. This can mislead operators reading diagnostic output.",
            "file": "middleware/sanitise.py",
        },
    ],
}
