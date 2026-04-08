"""Load all hard difficulty tasks from the corpus directory."""
import importlib.util
import os
from typing import List


def load_hard_tasks() -> List[dict]:
    """Return all hard TASK dicts from the corpus/hard directory."""
    tasks = []
    base = os.path.join(os.path.dirname(__file__), "..", "corpus", "hard")
    base = os.path.normpath(base)
    for fname in sorted(os.listdir(base)):
        if fname.endswith(".py") and not fname.startswith("__"):
            path = os.path.join(base, fname)
            spec = importlib.util.spec_from_file_location(fname, path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            tasks.append(mod.TASK)
    return tasks
