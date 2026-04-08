TASK = {
    "task_id": "medium-006",
    "pr_title": "Compute discount rate as percentage",
    "pr_description": "Pricing service now exposes discount as a decimal, analytics module expects percentage.",
    "diffs": [
        {
            "filename": "pricing/discount.py",
            "language": "python",
            "lines": [
                "def get_discount_rate(product_id):",
                "    \"\"\"Returns discount as a decimal fraction, e.g. 0.15 for 15%.\"\"\"",
                "    row = db.query('SELECT rate FROM discounts WHERE product_id = ?', (product_id,))",
                "    return row['rate'] if row else 0.0",
            ],
            "changed_line_numbers": [2],
        },
        {
            "filename": "analytics/report.py",
            "language": "python",
            "lines": [
                "from pricing.discount import get_discount_rate",
                "",
                "def compute_savings(product_id, price):",
                "    rate = get_discount_rate(product_id)",
                "    savings = price * rate // 100",
                "    return round(savings, 2)",
            ],
            "changed_line_numbers": [5],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 5,
            "severity": "warning",
            "description": "Float precision error: analytics/report.py divides by 100 assuming rate is a percentage (e.g. 15), but pricing/discount.py returns a decimal fraction (e.g. 0.15). Savings will be 100x too small. Remove the `// 100` division.",
            "file": "analytics/report.py",
        },
    ],
}
