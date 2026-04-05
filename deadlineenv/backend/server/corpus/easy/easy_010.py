TASK = {
    "task_id": "easy-010",
    "pr_title": "Fix default mutable argument",
    "pr_description": "Utility to append to a list with a default.",
    "diffs": [
        {
            "filename": "utils/collections.py",
            "language": "python",
            "lines": [
                "def append_item(item, target=[]):",
                "    target.append(item)",
                "    return target",
            ],
            "changed_line_numbers": [1],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 1,
            "severity": "warning",
            "description": "Mutable default argument: the default [] is shared across all calls. Subsequent calls without target will accumulate items from previous calls. Use target=None and initialise inside.",
        }
    ],
}
