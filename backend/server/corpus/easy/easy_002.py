TASK = {
    "task_id": "easy-002",
    "pr_title": "Add retry logic to HTTP client",
    "pr_description": "Wraps request call in retry loop for transient errors.",
    "diffs": [
        {
            "filename": "http_client.py",
            "language": "python",
            "lines": [
                "def fetch_with_retry(url, max_retries=3):",
                "    for attempt in range(max_retries):",
                "        try:",
                "            response = requests.get(url, timeout=5)",
                "            if response.status_code == 200:",
                "                return response.json()",
                "        except requests.RequestException:",
                "            if attempt == max_retries:",
                "                raise",
                "    return None",
            ],
            "changed_line_numbers": [8],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 8,
            "severity": "warning",
            "description": "Wrong comparison: attempt == max_retries is never true because range(max_retries) goes 0..max_retries-1. Should be attempt == max_retries - 1.",
        }
    ],
}
