TASK = {
    "task_id": "medium-007",
    "pr_title": "Update MAX_CONNECTIONS constant and propagate to pool",
    "pr_description": "Raised MAX_CONNECTIONS from 10 to 50 in config. Pool manager imports it at module level.",
    "diffs": [
        {
            "filename": "config/settings.py",
            "language": "python",
            "lines": [
                "# Connection pool settings",
                "MAX_CONNECTIONS = 50",
                "CONNECTION_TIMEOUT = 30",
                "RETRY_BACKOFF = 1.5",
            ],
            "changed_line_numbers": [2],
        },
        {
            "filename": "db/pool.py",
            "language": "python",
            "lines": [
                "from config.settings import MAX_CONNECTIONS",
                "",
                "_POOL_SIZE = MAX_CONNECTIONS",
                "",
                "def create_pool():",
                "    return ConnectionPool(size=_POOL_SIZE, timeout=30)",
                "",
                "def get_pool_info():",
                "    return {'max_connections': MAX_CONNECTIONS, 'pool_size': _POOL_SIZE}",
            ],
            "changed_line_numbers": [3],
        },
    ],
    "ground_truth_bugs": [
        {
            "line": 3,
            "severity": "warning",
            "description": "Stale module-level cache: _POOL_SIZE = MAX_CONNECTIONS is captured at import time. If settings are reloaded at runtime, _POOL_SIZE won't update. Reference MAX_CONNECTIONS directly in create_pool() to always reflect the current value.",
            "file": "db/pool.py",
        },
    ],
}
