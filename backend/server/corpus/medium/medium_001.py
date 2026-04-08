TASK = {
    "task_id": "medium-001",
    "pr_title": "Refactor user creation to use new validation service",
    "pr_description": "Moves validation logic into a shared service. Touches api.py and validators.py.",
    "diffs": [
        {
            "filename": "validators.py",
            "language": "python",
            "lines": [
                "class UserValidator:",
                "    def validate(self, username, email, role='user'):",
                "        \"\"\"Validate user fields. Returns (is_valid: bool, errors: list).\"\"\"",
                "        errors = []",
                "        if not username or len(username) < 3:",
                "            errors.append('Username too short')",
                "        if '@' not in email:",
                "            errors.append('Invalid email')",
                "        return len(errors) == 0, errors",
            ],
            "changed_line_numbers": [2],
        },
        {
            "filename": "api/users.py",
            "language": "python",
            "lines": [
                "from validators import UserValidator",
                "",
                "validator = UserValidator()",
                "",
                "def create_user(username, email, role):",
                "    is_valid, errors = validator.validate(username, role, email)",
                "    if not is_valid:",
                "        return {'error': errors}, 400",
                "    user = db.create({'username': username, 'email': email, 'role': role})",
                "    return {'id': user.id}, 201",
            ],
            "changed_line_numbers": [6],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 6,
            "severity": "critical",
            "description": "Argument order mismatch in api/users.py: validator.validate(username, role, email) passes role where email is expected and email where role is expected. Validator signature is validate(username, email, role).",
            "file": "api/users.py",
        },
    ],
}
