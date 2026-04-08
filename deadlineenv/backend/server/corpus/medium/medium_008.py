TASK = {
    "task_id": "medium-008",
    "pr_title": "Return all matching tags from search instead of first match",
    "pr_description": "search_tags now returns a list; display_tags in the UI layer assumes a single object.",
    "diffs": [
        {
            "filename": "search/tags.py",
            "language": "python",
            "lines": [
                "def search_tags(query):",
                "    \"\"\"Returns a list of matching tag dicts.\"\"\"",
                "    rows = db.execute(",
                "        'SELECT id, name, color FROM tags WHERE name LIKE ?',",
                "        (f'%{query}%',)",
                "    ).fetchall()",
                "    return [dict(r) for r in rows]",
            ],
            "changed_line_numbers": [2, 7],
        },
        {
            "filename": "ui/tag_display.py",
            "language": "python",
            "lines": [
                "from search.tags import search_tags",
                "",
                "def display_tags(query):",
                "    tag = search_tags(query)",
                "    print(f\"Tag: {tag['name']} ({tag['color']})\")",
            ],
            "changed_line_numbers": [4],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 4,
            "severity": "critical",
            "description": "Type mismatch: search_tags now returns a list, but display_tags treats it as a single dict by accessing tag['name']. Will raise TypeError: list indices must be integers or slices, not str.",
            "file": "ui/tag_display.py",
        },
    ],
}
