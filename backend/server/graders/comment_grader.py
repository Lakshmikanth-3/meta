from server.deadline_environment import keyword_overlap


def grade_comments(state) -> float:
    """Score: what fraction of ground truth bugs have a relevant comment?"""
    if not state.ground_truth_bugs:
        return 1.0
    found = 0
    for bug in state.ground_truth_bugs:
        for comment in state.comments_so_far:
            if comment.line_number == bug["line"] and comment.action_type.value == "add_comment":
                overlap = keyword_overlap(comment.content, bug["description"])
                if overlap > 0.3:
                    found += 1
                    break
    return round(found / len(state.ground_truth_bugs), 4)
