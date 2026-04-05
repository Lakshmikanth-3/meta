TASK = {
    "task_id": "medium-003",
    "pr_title": "Extract email sender into shared utility",
    "pr_description": "Moves send_email into utils/mailer.py, updates notification.py to import it.",
    "diffs": [
        {
            "filename": "utils/mailer.py",
            "language": "python",
            "lines": [
                "import smtplib",
                "",
                "def send_email(to_address, subject, body, from_address='noreply@app.com'):",
                "    with smtplib.SMTP('smtp.app.com', 587) as server:",
                "        server.sendmail(from_address, to_address, f'Subject: {subject}\\n\\n{body}')",
            ],
            "changed_line_numbers": [3],
        },
        {
            "filename": "notification.py",
            "language": "python",
            "lines": [
                "from utils.mailer import send_email",
                "",
                "def notify_user(user, message):",
                "    send_email(user.email, message, 'Password reset requested')",
                "    log.info(f'Notified {user.email}')",
            ],
            "changed_line_numbers": [4],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 4,
            "severity": "warning",
            "description": "Argument order wrong in notification.py: send_email(to, subject, body) but caller passes (user.email, message, 'Password reset requested') — message goes to subject, subject text goes to body.",
            "file": "notification.py",
        },
    ],
}
