TASK = {
    "task_id": "medium-009",
    "pr_title": "Add deadline check using UTC timestamps",
    "pr_description": "Deadline stored as UTC in DB. Comparison logic updated in task_manager.py.",
    "diffs": [
        {
            "filename": "db/tasks.py",
            "language": "python",
            "lines": [
                "from datetime import datetime, timezone",
                "",
                "def get_task_deadline(task_id):",
                "    row = db.execute('SELECT deadline FROM tasks WHERE id = ?', (task_id,)).fetchone()",
                "    if row is None:",
                "        return None",
                "    return datetime.fromisoformat(row['deadline']).replace(tzinfo=timezone.utc)",
            ],
            "changed_line_numbers": [7],
        },
        {
            "filename": "tasks/task_manager.py",
            "language": "python",
            "lines": [
                "from datetime import datetime",
                "from db.tasks import get_task_deadline",
                "",
                "def is_overdue(task_id):",
                "    deadline = get_task_deadline(task_id)",
                "    if deadline is None:",
                "        return False",
                "    return datetime.now() > deadline",
            ],
            "changed_line_numbers": [8],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 8,
            "severity": "warning",
            "description": "Timezone-naive comparison: deadline is timezone-aware (UTC) but datetime.now() returns a naive datetime. Python will raise TypeError: can't compare offset-naive and offset-aware datetimes. Use datetime.now(timezone.utc) instead.",
            "file": "tasks/task_manager.py",
        },
    ],
}
