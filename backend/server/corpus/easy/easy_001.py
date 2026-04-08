TASK = {
    "task_id": "easy-001",
    "pr_title": "Fix pagination offset calculation",
    "pr_description": "Adjusts page offset. Quick one-liner fix.",
    "diffs": [
        {
            "filename": "utils/pagination.py",
            "language": "python",
            "lines": [
                "def get_page_slice(items, page, page_size):",
                "    \"\"\"Return the slice of items for the given page (1-indexed).\"\"\"",
                "    start = page * page_size",
                "    end = start + page_size",
                "    return items[start:end]",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Off-by-one: start should be (page - 1) * page_size. Using page * page_size skips the first page entirely.",
        }
    ],
}
