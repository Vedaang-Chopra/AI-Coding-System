"""Tests for tools/check_complexity_budget.py."""

from __future__ import annotations

import importlib.util
import pathlib
import subprocess
import sys

import pytest

TOOLS = pathlib.Path(__file__).resolve().parent.parent / "tools"
SCRIPT = TOOLS / "check_complexity_budget.py"

spec = importlib.util.spec_from_file_location("check_complexity_budget", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args], capture_output=True, text=True
    )


class TestCounting:
    def test_counts_added_defs(self) -> None:
        diff = """diff --git a/a.py b/a.py
--- a/a.py
+++ b/a.py
@@ -1,3 +1,8 @@
+def new_one():
+    pass
+
+class NewThing:
+    pass
 def old_kept():
     pass
"""
        assert mod.count_additions(diff) == {"def": 1, "class": 1}

    def test_ignores_removed_and_context_lines(self) -> None:
        diff = """--- a/a.py
+++ b/a.py
@@ -1,5 +1,2 @@
-def gone():
-    pass
+def replacement():
+    pass
 context line with def word() inside
"""
        assert mod.count_additions(diff) == {"def": 1, "class": 0}

    def test_zero_diff_is_zero(self) -> None:
        assert mod.count_additions("") == {"def": 0, "class": 0}


class TestVerdict:
    def test_pass_under_budget(self) -> None:
        assert mod.verdict(3, 5) == "PASS"

    def test_fail_over_budget(self) -> None:
        assert mod.verdict(7, 5) == "FAIL"


class TestCli:
    @pytest.fixture()
    def git_repo(self, tmp_path: pathlib.Path) -> pathlib.Path:
        subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
        subprocess.run(
            ["git", "-C", str(tmp_path), "config", "user.email", "t@t"], check=True
        )
        subprocess.run(
            ["git", "-C", str(tmp_path), "config", "user.name", "t"], check=True
        )
        return tmp_path

    def _commit(self, repo: pathlib.Path, name: str, body: str) -> None:
        f = repo / name
        f.write_text(body)
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-qm", name], check=True)

    def test_pass_line_format(self, git_repo: pathlib.Path) -> None:
        self._commit(git_repo, "base.py", "def a():\n    pass\n")
        self._commit(git_repo, "new.py", "def b():\n    pass\nclass C:\n    pass\n")
        result = run_cli(
            "--repo", str(git_repo), "--range", "HEAD~1..HEAD", "--budget", "5"
        )
        assert result.returncode == 0
        assert "COMPLEXITY_BUDGET: PASS (2/5 new defs)" in result.stdout

    def test_fail_over_budget_exits_nonzero(self, git_repo: pathlib.Path) -> None:
        self._commit(git_repo, "base.py", "def a():\n    pass\n")
        self._commit(
            git_repo, "new.py", "\n".join(f"def f{i}():\n    pass\n" for i in range(7))
        )
        result = run_cli(
            "--repo", str(git_repo), "--range", "HEAD~1..HEAD", "--budget", "5"
        )
        assert result.returncode == 1
        assert "COMPLEXITY_BUDGET: FAIL (7/5 new defs)" in result.stdout
