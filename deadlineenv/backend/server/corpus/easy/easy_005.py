TASK = {
    "task_id": "easy-005",
    "pr_title": "Fix divide-by-zero in average calculator",
    "pr_description": "Calculates average of a list. Simple utility.",
    "diffs": [
        {
            "filename": "stats.py",
            "language": "python",
            "lines": [
                "def compute_average(values):",
                "    total = sum(values)",
                "    return total / len(values)",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Missing empty list check. If values is [], len(values) is 0, causing ZeroDivisionError at runtime.",
        }
    ],
}
