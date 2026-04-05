TASK = {
    "task_id": "easy-003",
    "pr_title": "Implement binary search helper",
    "pr_description": "Utility binary search for sorted lists.",
    "diffs": [
        {
            "filename": "utils/search.py",
            "language": "python",
            "lines": [
                "def binary_search(arr, target):",
                "    lo, hi = 0, len(arr)",
                "    while lo <= hi:",
                "        mid = (lo + hi) // 2",
                "        if arr[mid] == target:",
                "            return mid",
                "        elif arr[mid] < target:",
                "            lo = mid + 1",
                "        else:",
                "            hi = mid - 1",
                "    return -1",
            ],
            "changed_line_numbers": [2],
        }
    ],
    "ground_truth_bugs": [
        {
            "line": 2,
            "severity": "critical",
            "description": "Off-by-one in upper bound: hi should be len(arr) - 1 to avoid index out of range on arr[mid].",
        }
    ],
}
