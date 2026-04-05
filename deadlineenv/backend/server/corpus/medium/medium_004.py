TASK = {
    "task_id": "medium-004",
    "pr_title": "Add user_id to session payload and downstream consumer",
    "pr_description": "Session service now includes user_id in the token payload. The consumer service reads it.",
    "diffs": [
        {
            "filename": "auth/session.py",
            "language": "python",
            "lines": [
                "def create_session_token(user):",
                "    payload = {",
                "        'user_id': user.id,",
                "        'email': user.email,",
                "        'exp': time.time() + 3600,",
                "    }",
                "    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')",
            ],
            "changed_line_numbers": [3],
        },
        {
            "filename": "api/profile.py",
            "language": "python",
            "lines": [
                "from auth.session import decode_token",
                "",
                "def get_profile(request):",
                "    token = request.headers.get('Authorization', '').replace('Bearer ', '')",
                "    payload = decode_token(token)",
                "    uid = payload.get('userId')",
                "    if uid is None:",
                "        return {'error': 'Unauthorized'}, 401",
                "    user = db.find_user(uid)",
                "    return {'id': user.id, 'email': user.email}",
            ],
            "changed_line_numbers": [6],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 6,
            "severity": "critical",
            "description": "Dict key mismatch: session.py writes 'user_id' but api/profile.py reads 'userId'. payload.get('userId') will always return None, causing every authenticated request to fail with 401.",
            "file": "api/profile.py",
        },
    ],
}
