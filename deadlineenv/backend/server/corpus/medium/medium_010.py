TASK = {
    "task_id": "medium-010",
    "pr_title": "Integrate payment gateway and update order confirmation",
    "pr_description": "PaymentService.charge() returns 201 on success. Order service checks for this.",
    "diffs": [
        {
            "filename": "payments/gateway.py",
            "language": "python",
            "lines": [
                "import requests",
                "",
                "GATEWAY_URL = 'https://pay.example.com/v2'",
                "",
                "def charge(amount_cents, card_token):",
                "    \"\"\"Returns status code 201 on successful charge, 402 on decline.\"\"\"",
                "    resp = requests.post(",
                "        f'{GATEWAY_URL}/charges',",
                "        json={'amount': amount_cents, 'token': card_token},",
                "        timeout=10,",
                "    )",
                "    return resp.status_code",
            ],
            "changed_line_numbers": [6, 12],
        },
        {
            "filename": "orders/confirmation.py",
            "language": "python",
            "lines": [
                "from payments.gateway import charge",
                "",
                "def confirm_order(order_id, amount_cents, card_token):",
                "    status = charge(amount_cents, card_token)",
                "    if status == 200:",
                "        db.update_order(order_id, status='paid')",
                "        return {'success': True}",
                "    return {'success': False, 'error': f'Payment declined: {status}'}",
            ],
            "changed_line_numbers": [5],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 5,
            "severity": "critical",
            "description": "Wrong status code check: gateway.charge() returns 201 on success (as documented in its docstring), but confirmation.py checks for 200. Every successful payment will be treated as a failure, orders will never be marked paid.",
            "file": "orders/confirmation.py",
        },
    ],
}
