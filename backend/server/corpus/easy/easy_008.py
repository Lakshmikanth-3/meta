TASK = {
    "task_id": "easy-008",
    "pr_title": "Add cache lookup before DB read",
    "pr_description": "Short-circuits DB call when value is cached.",
    "diffs": [
        {
            "filename": "cache.py",
            "language": "python",
            "lines": [
                "def get_user(user_id):",
                "    cached = cache.get(user_id)",
                "    if cached != None:",
                "        return cached",
                "    user = db.find_user(user_id)",
                "    cache.set(user_id, user)",
                "    return user",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "nit",
            "description": "Style issue: use `is not None` instead of `!= None`. The != comparison can fail for objects with custom __eq__ returning unexpected values.",
        }
    ],
}
