def grade_severity(state) -> float:
    """Score: what fraction of classify_bug actions were correct?"""
    classify_actions = [c for c in state.comments_so_far if c.action_type.value == "classify_bug"]
    if not classify_actions:
        return 0.0
    correct = 0
    for action in classify_actions:
        for bug in state.ground_truth_bugs:
            if bug["line"] == action.line_number:
                if action.content == bug["severity"]:
                    correct += 1
                break
    return round(correct / len(classify_actions), 4)
