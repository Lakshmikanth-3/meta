TASK = {
    "task_id": "easy-004",
    "pr_title": "Add user role check to admin endpoint",
    "pr_description": "Guards the /admin route with a role check.",
    "diffs": [
        {
            "filename": "routes/admin.py",
            "language": "python",
            "lines": [
                "def admin_dashboard(request):",
                "    user = get_current_user(request)",
                "    if user.role != 'admin':",
                "        return render_admin_page(user)",
                "    raise PermissionError('Admins only')",
            ],
            "changed_line_numbers": [3],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "critical",
            "description": "Inverted condition: the guard blocks admins and lets non-admins through. Should be `if user.role == 'admin'` to allow, not deny.",
        }
    ],
}
