TASK = {
    "task_id": "easy-006",
    "pr_title": "Update loop to use inclusive upper bound",
    "pr_description": "Range fix for inclusive day counting.",
    "diffs": [
        {
            "filename": "scheduler.py",
            "language": "python",
            "lines": [
                "def count_business_days(start, end):",
                "    count = 0",
                "    for day in range(start, end):",
                "        if day % 7 not in (5, 6):",
                "            count += 1",
                "    return count",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "warning",
            "description": "Exclusive upper bound: range(start, end) excludes the end day. Should be range(start, end + 1) to count the end date.",
        }
    ],
}
