import random
import uuid
from typing import Optional
import importlib.util
import os

from models import (
    DeadlineAction,
    DeadlineObservation,
    DeadlineState,
    ActionType,
    BugSeverity,
    FileDiff,
    ReviewComment,
)

# Load all corpus tasks at startup
_CORPUS: dict[str, list[dict]] = {"easy": [], "medium": [], "hard": []}


def _load_corpus():
    base = os.path.join(os.path.dirname(__file__), "corpus")
    if not os.path.isdir(base):
        raise RuntimeError(f"Corpus directory not found: {base}")

    for difficulty in ("easy", "medium", "hard"):
        folder = os.path.join(base, difficulty)
        if not os.path.isdir(folder):
            raise RuntimeError(f"Corpus difficulty directory not found: {folder}")

        _CORPUS[difficulty] = []
        for fname in sorted(os.listdir(folder)):
            if fname.endswith(".py") and not fname.startswith("__"):
                file_path = os.path.join(folder, fname)
                spec = importlib.util.spec_from_file_location(fname, file_path)
                if spec is None or spec.loader is None:
                    raise RuntimeError(f"Failed to load corpus module from {file_path}")
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                if not hasattr(mod, "TASK"):
                    raise RuntimeError(f"Corpus module missing TASK: {file_path}")
                _CORPUS[difficulty].append(mod.TASK)

        if not _CORPUS[difficulty]:
            raise RuntimeError(f"No corpus tasks found for difficulty '{difficulty}' in {folder}")


_load_corpus()


def keyword_overlap(comment: str, bug_description: str) -> float:
    stop = {"the", "a", "an", "is", "in", "on", "of", "to", "and", "or", "it", "this", "that", "be", "by"}
    c_words = set(comment.lower().split()) - stop
    b_words = set(bug_description.lower().split()) - stop
    if not b_words:
        return 0.0
    return len(c_words & b_words) / len(b_words)


def severity_adjacent(given: str, correct: str) -> bool:
    order = ["nit", "ok", "warning", "critical"]
    if given not in order or correct not in order:
        return False
    return abs(order.index(given) - order.index(correct)) == 1


class DeadlineEnvironment:
    def __init__(self):
        self._state: Optional[DeadlineState] = None
        self._max_steps: int = 20

    def reset(self, task_difficulty: str = "easy", custom_task: dict = None) -> DeadlineObservation:
        if custom_task:
            task = custom_task
            difficulty = task.get("difficulty", "custom")
            episode_id = str(uuid.uuid4())
        else:
            if task_difficulty not in _CORPUS:
                raise ValueError(f"Unknown task_difficulty '{task_difficulty}'. Use one of: easy, medium, hard")
            difficulty = task_difficulty
            if not _CORPUS[difficulty]:
                raise RuntimeError(f"Corpus for difficulty '{difficulty}' is empty")
            episode_id = str(uuid.uuid4())
            rng = random.Random(episode_id)
            task = rng.choice(_CORPUS[difficulty])

        max_steps = task.get("max_steps_override", 20)

        self._state = DeadlineState(
            task_id=task["task_id"],
            task_difficulty=difficulty,
            pr_title=task["pr_title"],
            pr_description=task["pr_description"],
            diffs=[FileDiff(**d) for d in task["diffs"]],
            ground_truth_bugs=task["ground_truth_bugs"],
            comments_so_far=[],
            verdict=None,
            step=0,
            done=False,
            total_reward=0.0,
            episode_id=episode_id,
        )
        self._max_steps = max_steps
        return self._make_observation()

    def step(self, action: DeadlineAction) -> tuple[DeadlineObservation, float, bool, dict]:
        if self._state is None:
            raise RuntimeError("Call reset() before step()")
        if self._state.done:
            return self._make_observation(), 0.0, True, {}

        state = self._state
        error = self._validate_action(action)

        reward = 0.0
        if error is None:
            reward = self._compute_step_reward(action, state)
        else:
            reward = -0.02  # step penalty only on invalid action

        state.total_reward += reward
        state.step += 1

        comment = ReviewComment(
            step=state.step,
            line_number=action.line_number,
            action_type=action.action_type,
            content=action.content,
            reward_earned=round(reward, 4),
        )
        state.comments_so_far.append(comment)

        if action.action_type in (ActionType.APPROVE, ActionType.REQUEST_CHANGES):
            state.verdict = action.action_type.value
            state.done = True
        elif state.step >= self._max_steps:
            state.done = True

        obs = self._make_observation(last_error=error)
        return obs, round(reward, 4), state.done, {"total_reward": state.total_reward}

    def state(self) -> DeadlineState:
        if self._state is None:
            raise RuntimeError("Call reset() first")
        return self._state

    def _validate_action(self, action: DeadlineAction) -> Optional[str]:
        if action.action_type in (ActionType.ADD_COMMENT, ActionType.CLASSIFY_BUG):
            if action.line_number is None:
                return f"{action.action_type.value} requires line_number"
            if action.line_number < 1:
                return "line_number must be >= 1"
        if action.action_type == ActionType.CLASSIFY_BUG:
            valid_severities = {s.value for s in BugSeverity}
            if action.content not in valid_severities:
                return f"classify_bug content must be one of {valid_severities}"
        return None

    def _get_bug_at_line(self, line: int) -> Optional[dict]:
        for bug in self._state.ground_truth_bugs:
            if bug["line"] == line:
                return bug
        return None

    def _count_commented_criticals(self) -> int:
        critical_lines = {b["line"] for b in self._state.ground_truth_bugs if b["severity"] == "critical"}
        commented_lines = {c.line_number for c in self._state.comments_so_far if c.line_number is not None}
        return len(critical_lines & commented_lines)

    def _compute_step_reward(self, action: DeadlineAction, state: DeadlineState) -> float:
        reward = 0.0
        ground_truth_lines = {b["line"] for b in state.ground_truth_bugs}

        if action.action_type == ActionType.ADD_COMMENT:
            if action.line_number in ground_truth_lines:
                bug = self._get_bug_at_line(action.line_number)
                overlap = keyword_overlap(action.content, bug["description"])
                reward += 0.3 * overlap
                if overlap > 0.6:
                    reward += 0.2
            else:
                reward -= 0.05

        elif action.action_type == ActionType.CLASSIFY_BUG:
            if action.line_number in ground_truth_lines:
                bug = self._get_bug_at_line(action.line_number)
                if action.content == bug["severity"]:
                    reward += 0.25
                elif severity_adjacent(action.content, bug["severity"]):
                    reward += 0.1
            else:
                reward -= 0.05

        elif action.action_type == ActionType.ASK_QUESTION:
            reward += 0.05

        elif action.action_type in (ActionType.APPROVE, ActionType.REQUEST_CHANGES):
            critical_bugs = [b for b in state.ground_truth_bugs if b["severity"] == "critical"]
            has_critical = len(critical_bugs) > 0
            agent_blocked = action.action_type == ActionType.REQUEST_CHANGES

            if has_critical and agent_blocked:
                commented_criticals = self._count_commented_criticals()
                coverage = commented_criticals / max(len(critical_bugs), 1)
                reward += 0.5 + 0.5 * coverage
            elif has_critical and not agent_blocked:
                reward -= 0.5
            elif not has_critical and not agent_blocked:
                efficiency = 1.0 - (state.step / self._max_steps)
                reward += 0.4 + 0.3 * efficiency
            elif not has_critical and agent_blocked:
                reward -= 0.1

        # Step penalty (urgency signal)
        reward -= 0.02
        return round(reward, 4)

    def _make_observation(self, last_error: Optional[str] = None) -> DeadlineObservation:
        state = self._state
        steps_remaining = max(0, self._max_steps - state.step)
        if steps_remaining <= 3:
            msg = f"⚠️ {steps_remaining} steps left. Deadline imminent."
        elif steps_remaining <= 7:
            msg = f"Clock ticking. {steps_remaining} steps remaining."
        else:
            msg = f"Step {state.step}. Review carefully."

        return DeadlineObservation(
            task_id=state.task_id,
            pr_title=state.pr_title,
            pr_description=state.pr_description,
            diffs=state.diffs,
            total_lines_changed=sum(len(d.changed_line_numbers) for d in state.diffs),
            step=state.step,
            steps_remaining=steps_remaining,
            comments_so_far=state.comments_so_far,
            last_action_error=last_error,
            system_message=msg,
        )
