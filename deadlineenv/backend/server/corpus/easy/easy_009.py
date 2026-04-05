TASK = {
    "task_id": "easy-009",
    "pr_title": "Fix list mutation inside loop",
    "pr_description": "Filters expired items from a session list.",
    "diffs": [
        {
            "filename": "session_manager.py",
            "language": "python",
            "lines": [
                "def remove_expired(sessions):",
                "    for session in sessions:",
                "        if session.is_expired():",
                "            sessions.remove(session)",
                "    return sessions",
            ],
            "changed_line_numbers": [2],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 2,
            "severity": "warning",
            "description": "List mutation during iteration: calling sessions.remove() inside a for loop over the same list skips elements. Use a list comprehension or iterate over a copy.",
        }
    ],
}
