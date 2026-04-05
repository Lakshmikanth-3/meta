from __future__ import annotations
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    ADD_COMMENT = "add_comment"
    ASK_QUESTION = "ask_question"
    CLASSIFY_BUG = "classify_bug"
    APPROVE = "approve"
    REQUEST_CHANGES = "request_changes"


class BugSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    NIT = "nit"
    OK = "ok"


class DeadlineAction(BaseModel):
    action_type: ActionType = Field(..., description="Which review action to take")
    line_number: Optional[int] = Field(None, description="Target line in the diff (1-indexed)")
    content: str = Field(..., description="Text of comment / severity label / verdict justification")


class FileDiff(BaseModel):
    filename: str
    language: str
    lines: list[str]
    changed_line_numbers: list[int]


class ReviewComment(BaseModel):
    step: int
    line_number: Optional[int]
    action_type: ActionType
    content: str
    reward_earned: float


class DeadlineObservation(BaseModel):
    task_id: str
    pr_title: str
    pr_description: str
    diffs: list[FileDiff]
    total_lines_changed: int
    step: int
    steps_remaining: int
    comments_so_far: list[ReviewComment]
    last_action_error: Optional[str]
    system_message: str


class DeadlineState(BaseModel):
    task_id: str
    task_difficulty: Literal["easy", "medium", "hard", "custom"]
    pr_title: str
    pr_description: str
    diffs: list[FileDiff]
    ground_truth_bugs: list[dict]
    comments_so_far: list[ReviewComment]
    verdict: Optional[str]
    step: int
    done: bool
    total_reward: float
    episode_id: str
