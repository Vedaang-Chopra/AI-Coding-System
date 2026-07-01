---
name: write-tests
description: >
  Use when writing unit tests for functions and classes in the tests/ directory.
  Distinct from notebooks — unit tests verify function-level contracts with binary
  pass/fail outcomes. Write tests in the same phase as the implementation they
  cover, never after. Triggers: "write tests for", "add unit tests", task has a
  Verify step requiring pytest, or any new public function is added.
---

# SKILL: write-tests

## Trigger

Use this skill when:
* A new function or class has been added to a public interface.
* A task in `tasks.md` has a `Verify:` step referencing `pytest`.
* Implementing Phase 3 (public interface) of any feature.
* An existing function's behavior changes.

Do NOT write tests after the full feature is implemented — write them
per function, per phase, as the code is written.

---

## What Unit Tests Are (and Are Not)

Unit tests are **function-level contracts**: they verify that a function
does what its signature and docstring claim, for known inputs and known failure modes.

| Artifact | Purpose | Pass/fail | Run when |
|---|---|---|---|
| `tests/test_X.py` | Contract per function | Binary — pass or fail | CI, pre-commit, per-phase |
| `notebooks/X_inspection.ipynb` | Behavior demonstration | Human review | Manually, during development |
| `scripts/smoke_X.py` | Module runs end-to-end | Binary | Pre-deploy |

Do not conflate these. A notebook that "runs without error" is not a unit test.

---

## Output Location

`tests/test_<module_name>.py`

One test file per module. If a module is large, split by submodule:
`tests/test_<module>_<submodule>.py`

---

## Required Test Categories Per Module

For every public function, write at minimum:

1. **Happy path** — correct input → correct output type and shape
2. **Edge case** — empty input, boundary value, minimum/maximum count
3. **Failure case** — wrong type, missing required field, invalid config → expected exception

If the function has more than 3 distinct behaviors, each behavior gets its own test.

---

## File Template

```python
"""
Unit tests for <module_name>.<submodule>.
Tests the public interface: <module>.interfaces.<function>.

Run: pytest tests/test_<module_name>.py -v
"""
import pytest
from <module>.interfaces import <FunctionA>, <FunctionB>


class Test<FunctionA>:
    """Tests for <FunctionA>."""

    def test_happy_path_returns_expected_type(self):
        """<FunctionA> returns <ReturnType> for valid input."""
        result = <FunctionA>(valid_input)
        assert isinstance(result, <ReturnType>)

    def test_happy_path_output_has_required_fields(self):
        """<FunctionA> output contains all required fields."""
        result = <FunctionA>(valid_input)
        assert hasattr(result, "required_field")
        assert result.required_field is not None

    def test_empty_input_returns_empty(self):
        """<FunctionA> handles empty input without raising."""
        result = <FunctionA>([])
        assert result == [] or result is not None  # define expected behavior

    def test_invalid_input_raises_value_error(self):
        """<FunctionA> raises ValueError for malformed input."""
        with pytest.raises(ValueError, match="<expected message substring>"):
            <FunctionA>(invalid_input)

    def test_missing_required_field_raises(self):
        """<FunctionA> raises KeyError when required field is absent."""
        with pytest.raises((KeyError, AttributeError)):
            <FunctionA>(input_missing_field)


class Test<FunctionB>:
    ...
```

---

## Rules

1. Import only from the module's public interface (`interfaces.py`, `api.py`,
   `runners.py`). Never import from `core/` or internal files in tests.
2. One test class per public function or per public class.
3. Naming: `test_<function>_<scenario>` — e.g., `test_load_inputs_missing_file`.
4. No test may depend on state from another test. Each test is independent.
5. No test may call a real external service, real model, or real filesystem path.
   Mock everything external using `unittest.mock` or `pytest-mock`.
6. Every new test file must run clean with: `pytest tests/test_<module>.py -v`
7. Test the behavior stated in the docstring. If there is no docstring, write
   the docstring before writing the test.
8. Tests are not documentation — they are contracts. Keep them short and precise.
   Explanation goes in the docstring, not in test body comments.

---

## Mocking Pattern

```python
from unittest.mock import patch, MagicMock

def test_load_inputs_calls_file_reader(self):
    """load_inputs calls the file reader with the correct path."""
    with patch("module.core.loader._read_file") as mock_read:
        mock_read.return_value = [{"id": "1"}]
        result = load_inputs(PipelineConfig(input_path="fake/path"))
        mock_read.assert_called_once_with("fake/path")
        assert len(result) == 1
```

---

## Checklist Before Closing a Phase

- [ ] Every new public function has at least one happy path test.
- [ ] Every new public function has at least one failure case test.
- [ ] No test imports from internal files (`core/`, `schemas/` directly).
- [ ] All external calls are mocked.
- [ ] `pytest tests/test_<module>.py -v` runs clean.
- [ ] Test file is added to CI if CI exists.

---

## Related Skills

* `SKILL: decompose-tasks` — each task's Verify step maps to a test here
* `SKILL: design-feature-notebook` — notebook is separate from these tests
* `SKILL: verify-checkpoint` — runs these tests as part of checkpoint validation
