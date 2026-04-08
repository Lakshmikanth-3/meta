def grade_verdict(state) -> float:
    """Score the correctness of the agent's final verdict."""
    critical_bugs = [b for b in state.ground_truth_bugs if b["severity"] == "critical"]
    has_critical = len(critical_bugs) > 0

    if state.verdict is None:
        return 0.0  # episode timed out without verdict

    agent_blocked = state.verdict == "request_changes"

    if has_critical and agent_blocked:
        return 1.0
    elif has_critical and not agent_blocked:
        return 0.0
    elif not has_critical and not agent_blocked:
        return 1.0
    else:
        return 0.3  # false positive block
