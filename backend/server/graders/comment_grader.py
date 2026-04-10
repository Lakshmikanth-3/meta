from server.deadline_environment import llm_grade_comment


def grade_comments(state) -> float:
    """Score: what fraction of ground truth bugs have a relevant comment?"""
    if not state.ground_truth_bugs:
        return 0.99
    found = 0
    for bug in state.ground_truth_bugs:
        for comment in state.comments_so_far:
            if comment.line_number == bug["line"] and comment.action_type.value == "add_comment":
                score = llm_grade_comment(comment.content, bug["description"])
                if score > 0.4:
                    found += 1
                    break
    final_score = found / len(state.ground_truth_bugs)
    return round(max(0.01, min(0.99, final_score)), 4)
