TASK = {
    "task_id": "medium-002",
    "pr_title": "Add transaction rollback to order processing",
    "pr_description": "Wraps inventory deduct and order insert in a transaction block.",
    "diffs": [
        {
            "filename": "inventory.py",
            "language": "python",
            "lines": [
                "def deduct_stock(product_id, quantity, conn):",
                "    \"\"\"Deduct stock inside an existing connection/transaction.\"\"\"",
                "    conn.execute(",
                "        'UPDATE inventory SET stock = stock - ? WHERE product_id = ?',",
                "        (quantity, product_id)",
                "    )",
                "    return True",
            ],
            "changed_line_numbers": [1],
        },
        {
            "filename": "orders.py",
            "language": "python",
            "lines": [
                "import sqlite3",
                "from inventory import deduct_stock",
                "",
                "def place_order(product_id, quantity, user_id):",
                "    conn = sqlite3.connect('shop.db')",
                "    deduct_stock(product_id, quantity, conn)",
                "    conn.execute(",
                "        'INSERT INTO orders (product_id, quantity, user_id) VALUES (?, ?, ?)',",
                "        (product_id, quantity, user_id)",
                "    )",
                "    conn.commit()",
                "    conn.close()",
            ],
            "changed_line_numbers": [11],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 11,
            "severity": "critical",
            "description": "Missing rollback: if the INSERT into orders fails after deduct_stock has run, the stock is permanently decremented with no matching order. Wrap in try/except with conn.rollback().",
            "file": "orders.py",
        },
    ],
}
