TASK = {
    "task_id": "medium-005",
    "pr_title": "Rename update endpoint from POST to PUT",
    "pr_description": "REST convention: the update resource endpoint now uses PUT. Client updated separately.",
    "diffs": [
        {
            "filename": "routes/items.py",
            "language": "python",
            "lines": [
                "from flask import Blueprint, request, jsonify",
                "",
                "items_bp = Blueprint('items', __name__)",
                "",
                "@items_bp.route('/items/<int:item_id>', methods=['PUT'])",
                "def update_item(item_id):",
                "    data = request.get_json()",
                "    item = db.update_item(item_id, data)",
                "    return jsonify(item), 200",
            ],
            "changed_line_numbers": [5],
        },
        {
            "filename": "client/items_client.py",
            "language": "python",
            "lines": [
                "import requests",
                "",
                "BASE_URL = 'http://localhost:5000'",
                "",
                "def update_item(item_id, payload):",
                "    resp = requests.post(f'{BASE_URL}/items/{item_id}', json=payload)",
                "    resp.raise_for_status()",
                "    return resp.json()",
            ],
            "changed_line_numbers": [6],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 6,
            "severity": "critical",
            "description": "Wrong HTTP method in client: the route was changed to PUT but client/items_client.py still calls requests.post(). This will result in 405 Method Not Allowed on every update call.",
            "file": "client/items_client.py",
        },
    ],
}
