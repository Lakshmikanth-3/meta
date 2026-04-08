TASK = {
    "task_id": "easy-007",
    "pr_title": "Fix string concatenation in SQL query builder",
    "pr_description": "Helper to build a simple SELECT query string.",
    "diffs": [
        {
            "filename": "db/query_builder.py",
            "language": "python",
            "lines": [
                "def build_select(table, column, value):",
                "    query = f\"SELECT * FROM {table} WHERE {column} = '{value}'\"",
                "    return query",
            ],
            "changed_line_numbers": [2],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 2,
            "severity": "critical",
            "description": "SQL injection vulnerability: user-controlled value is interpolated directly into query string. Use parameterised queries instead.",
        }
    ],
}
