TASK = {
    "task_id": "hard-005",
    "pr_title": "Add expression evaluator endpoint for analytics",
    "pr_description": "Lets users run custom aggregation expressions against their dataset via API.",
    "max_steps_override": 12,
    "diffs": [
        {
            "filename": "routes/analytics.py",
            "language": "python",
            "lines": [
                "from flask import Blueprint, request, jsonify",
                "",
                "analytics_bp = Blueprint('analytics', __name__)",
                "",
                "@analytics_bp.route('/analytics/eval', methods=['POST'])",
                "def eval_expression():",
                "    expr = request.json.get('expression', '')",
                "    result = eval(expr)",
                "    return jsonify({'result': result})",
            ],
            "changed_line_numbers": [8],
        },
        {
            "filename": "routes/objects.py",
            "language": "python",
            "lines": [
                "from flask import Blueprint, request, jsonify",
                "",
                "objects_bp = Blueprint('objects', __name__)",
                "",
                "@objects_bp.route('/objects/<int:object_id>')",
                "def get_object(object_id):",
                "    obj = db.get_object(object_id)",
                "    return jsonify(obj.to_dict())",
            ],
            "changed_line_numbers": [5],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 8,
            "severity": "critical",
            "description": "Remote code execution via eval(): user-controlled expression is passed directly to Python's eval(). This is command injection through expression evaluation, letting an attacker execute arbitrary code, read files, or spawn processes.",
            "file": "routes/analytics.py",
        },
        {
            "line": 5,
            "severity": "critical",
            "description": "Insecure direct object reference with auth bypass: /objects/<object_id> fetches any object by ID with no ownership check. A user can enumerate all objects by iterating IDs. Enforce ownership validation before returning data.",
            "file": "routes/objects.py",
        },
    ],
}
