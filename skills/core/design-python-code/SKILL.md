---
name: design-python-code
description: >
  Use when writing any new class, deciding whether something should be a class
  or function, adding significant logic to an existing module, or when a
  directory is growing and needs internal organization. Applies SOLID principles
  and OOP design decisions to Python code. Distinct from design-layered-module
  (which decides which layer a file belongs to) — this skill decides how to
  structure the code within a layer. Triggers: "design this class", "how should
  I structure this", "should this be a class or function", a core/ directory
  with 4+ unrelated files, or any task producing more than 2 new Python files
  in the same directory.
---

# SKILL: design-python-code

## Scope and Boundary

This skill handles **code design within a layer**.

| Skill | Handles |
|---|---|
| `design-layered-module` | Which layer a file belongs to (notebook/runner/core/schema/utils) |
| `design-python-code` | How code is structured within a layer — classes, abstractions, grouping |
| `create-module` | Scaffolding the base directory and files of a new module |

Apply this skill before writing any substantial class or group of related functions.
Apply it proactively — during planning, not after the code is already wrong.

---

## Step 1: Class vs Function Decision

The most common design mistake in Python is putting everything in a class because
it "feels more organized," or putting everything in functions because classes
"seem unnecessary." Use the decision below every time.

### Use a CLASS when:

**1. Shared state across methods**
Multiple methods need to read or write the same state. If methods are passing
the same variables to each other, they belong in a class.

```python
# Wrong — functions passing the same state around
def load(path): ...
def process(records, config): ...   # config repeating
def save(records, config, output_path): ...   # config repeating again

# Right — shared state in a class
class Pipeline:
    def __init__(self, config: PipelineConfig):
        self.config = config  # owned once

    def load(self) -> list[Record]: ...
    def process(self, records: list[Record]) -> list[Record]: ...
    def save(self, records: list[Record]) -> None: ...
```

**2. Multiple implementations of the same interface**
When you have (or expect) different strategies for the same behavior, use an
abstract class or Protocol to define the contract.

```python
from abc import ABC, abstractmethod

class Evaluator(ABC):
    @abstractmethod
    def compute(self, predicted: Any, ground_truth: Any) -> float: ...

class ChamferEvaluator(Evaluator):
    def compute(self, predicted, ground_truth) -> float: ...

class HausdorffEvaluator(Evaluator):
    def compute(self, predicted, ground_truth) -> float: ...
```

**3. Lifecycle or resource management**
When there is setup, operation, and teardown. Use `__enter__` / `__exit__` for
resources that must be released.

**4. Complex configuration shared across many operations**
When a group of functions all need the same configuration object repeatedly,
that configuration + the functions belong in a class.

### Use a FUNCTION when:

**1. Stateless transformation**
Input in, output out, no side effects, no persistent state.

```python
def normalize_path(path: str) -> Path:
    return Path(path).resolve()
```

**2. Single utility operation**
No shared state, no configuration, no lifecycle.

**3. The "class" would have one method**
A class with only `__init__` and one method is a function wearing a disguise.

```python
# Wrong
class RecordValidator:
    def validate(self, record: Record) -> bool: ...

# Right
def validate_record(record: Record) -> bool: ...
```

**4. The operation is globally reusable and context-free**
Goes in `utils/` as a plain function.

---

## Step 2: SOLID Principles — Python Application

Apply these in order. S and D violations are the most common.

### S — Single Responsibility

One class has one reason to change. One function does one thing.

**Signal that SRP is violated:** You describe what a class/function does and
the description contains "and."

```python
# Violates SRP — loads AND validates AND transforms
class DataProcessor:
    def load_and_validate_and_transform(self, path): ...

# Correct — each class has one job
class DataLoader:
    def load(self, path: str) -> list[Record]: ...

class RecordValidator:
    def validate(self, records: list[Record]) -> list[Record]: ...

class RecordTransformer:
    def transform(self, records: list[Record]) -> list[ProcessedRecord]: ...
```

Before writing a class, write its responsibility in one sentence.
If you cannot, the boundary is wrong.

---

### O — Open/Closed

Code should be open for extension, closed for modification.
Do not add `if isinstance(x, TypeA): ... elif isinstance(x, TypeB): ...` chains.
Use polymorphism instead.

```python
# Violates OCP — adding a new evaluator requires modifying this function
def evaluate(evaluator_type: str, pred, gt):
    if evaluator_type == "chamfer":
        return chamfer_distance(pred, gt)
    elif evaluator_type == "hausdorff":
        return hausdorff_distance(pred, gt)
    # Must modify here every time a new evaluator is added

# Correct — new evaluators extend without modifying existing code
class Evaluator(ABC):
    @abstractmethod
    def compute(self, pred: Any, gt: Any) -> float: ...

def evaluate(evaluator: Evaluator, pred, gt) -> float:
    return evaluator.compute(pred, gt)
```

In Python: use ABCs or Protocols to define extension points. Use `isinstance()`
only for input validation, never for behavior branching.

---

### L — Liskov Substitution

A subclass must be substitutable for its parent in every context. If a subclass
changes the contract (raises where the parent wouldn't, returns a different type,
ignores required arguments), it violates LSP.

```python
# Violates LSP — subclass changes the return type contract
class BaseProcessor:
    def process(self, record: Record) -> ProcessedRecord: ...

class SpecialProcessor(BaseProcessor):
    def process(self, record: Record) -> None:  # changes return type — violation
        ...

# Correct
class SpecialProcessor(BaseProcessor):
    def process(self, record: Record) -> ProcessedRecord: ...  # same contract
```

Practical rule: if you override a method and the override raises
`NotImplementedError` or silently does nothing, you need composition, not
inheritance.

---

### I — Interface Segregation

Do not force clients to depend on methods they don't use.
Fat ABCs should be split into focused Protocols.

```python
# Violates ISP — every implementor must define all three even if unused
class DataHandler(ABC):
    @abstractmethod
    def load(self): ...
    @abstractmethod
    def save(self): ...
    @abstractmethod
    def validate(self): ...

# Correct — use Python Protocols for structural typing
from typing import Protocol

class Loadable(Protocol):
    def load(self, path: str) -> Any: ...

class Saveable(Protocol):
    def save(self, data: Any, path: str) -> None: ...

# A class implements only what it actually does
class ReadOnlyStore:
    def load(self, path: str) -> Any: ...  # Loadable ✓, doesn't need Saveable
```

In Python, prefer `Protocol` over ABC when you don't need shared implementation.
Prefer ABC when you have shared implementation to inherit.

---

### D — Dependency Inversion

Depend on abstractions (ABCs, Protocols), not on concrete implementations.
Pass dependencies in (inject them) rather than creating them inside.

```python
# Violates DIP — creates its own dependency internally
class RepairEngine:
    def __init__(self):
        self.evaluator = ChamferEvaluator()  # hardcoded concrete class

# Correct — depends on the abstraction, concrete choice is injected
class RepairEngine:
    def __init__(self, evaluator: Evaluator):
        self.evaluator = evaluator

# Caller decides the concrete type
engine = RepairEngine(evaluator=ChamferEvaluator())
```

Practical rule: if your `__init__` instantiates another class with `SomeClass()`,
that's a DIP violation unless `SomeClass` is a trivial data container.

---

## Step 3: Composition Over Inheritance

Default to composition. Use inheritance only when the relationship is genuinely
"is-a" and the subclass doesn't need to change the parent's contract.

```python
# Inheritance used wrong — SpecialLoader is not a DataLoader conceptually
class SpecialLoader(DataLoader):
    def load(self, path): ...  # overrides everything, doesn't use parent

# Composition — SpecialLoader has a loader
class SpecialLoader:
    def __init__(self, loader: DataLoader):
        self.loader = loader

    def load_with_retry(self, path: str, retries: int = 3) -> list[Record]:
        for _ in range(retries):
            try:
                return self.loader.load(path)
            except IOError:
                continue
        raise RuntimeError(f"Failed after {retries} retries: {path}")
```

---

## Step 4: Python Class Patterns

### Dataclass for data containers
Use `@dataclass` (or Pydantic's `BaseModel`) for classes that exist to hold data,
not for classes that have significant behavior.

```python
from dataclasses import dataclass, field

@dataclass
class RepairRecord:
    operation_id: str
    failure_mode: str
    repair_candidates: list[str] = field(default_factory=list)
    is_resolved: bool = False
```

Do not write `__init__`, `__repr__`, or `__eq__` manually for pure data classes.

### Class methods as named constructors
When a class can be created from multiple input formats, use `@classmethod`.

```python
class PipelineConfig:
    def __init__(self, input_path: str, max_retries: int):
        self.input_path = input_path
        self.max_retries = max_retries

    @classmethod
    def from_dict(cls, d: dict) -> "PipelineConfig":
        return cls(d["input_path"], d.get("max_retries", 3))

    @classmethod
    def from_file(cls, path: str) -> "PipelineConfig":
        import json
        return cls.from_dict(json.loads(Path(path).read_text()))
```

### Properties for computed attributes
Use `@property` for attributes derived from other attributes. Do not use
`get_X()` methods in Python for simple attribute access.

```python
@dataclass
class Record:
    raw_value: float
    scale_factor: float

    @property
    def normalized_value(self) -> float:
        return self.raw_value / self.scale_factor
```

---

## Step 5: Named OOP Patterns — Detection Triggers

These four patterns cover the most common cases where flat functions are produced
when a class is required. For each: the detection trigger is what you see in the
code; the required structure is what must replace it.

---

### Pattern 1 — Registry (load-once, query-many)

**Detection trigger:** A function loads data from disk (JSON, YAML, database)
and is called more than once in any execution path. You see log lines like
`load_registry | start` appearing repeatedly in a single run.

**Required:** Replace with a class. `__init__` loads once. All public methods
query in-memory state only. No disk I/O after construction.

```python
# WRONG — loads from disk on every call
def default_meaningful_label_registry() -> dict:
    return json.loads(Path("registry.json").read_text())

# RIGHT — loads once, queries many times
class LabelRegistry:
    def __init__(self, path: Path):
        self._data: dict = json.loads(path.read_text())

    def get_categories(self) -> list[str]:
        return self._data["categories"]

    def lookup(self, key: str) -> str | None:
        return self._data.get(key)
```

---

### Pattern 2 — Cache-bearing object

**Detection trigger:** A module has a cache dict (`cache: dict = {}` or
`self.cache = {}`) that is populated at runtime and checked before expensive
operations (LLM calls, file reads, network requests). You see `load_cache` and
`save_cache` as separate module-level functions.

**Required:** The cache dict becomes `self._cache`. The class owns initialization,
lookup, population, and persistence.

```python
# WRONG — cache is a loose dict, load/save are separate functions
cache: dict = {}

def load_cache(path: Path) -> None:
    global cache
    cache = json.loads(path.read_text())

def annotate(key: str) -> Annotation:
    if key in cache:
        return cache[key]
    ...

# RIGHT — class owns cache lifecycle
class Annotator:
    def __init__(self, cache_path: Path):
        self._cache_path = cache_path
        self._cache: dict[str, Annotation] = self._load()

    def annotate(self, key: str) -> Annotation:
        if key in self._cache:
            return self._cache[key]
        result = self._call_llm(key)
        self._cache[key] = result
        return result

    def save(self) -> None:
        self._cache_path.write_text(json.dumps(self._cache))

    def _load(self) -> dict[str, Annotation]:
        if self._cache_path.exists():
            return json.loads(self._cache_path.read_text())
        return {}
```

---

### Pattern 3 — Config / Paths dataclass

**Detection trigger:** Three or more related `Path` or config values travel
together through function signatures as separate parameters. You see the same
group of arguments repeated across 3+ function definitions.

**Required:** Group into a `@dataclass`. Pass the dataclass, not the individual fields.

```python
# WRONG — same three paths repeated in every function signature
def load_traces(combined_path: Path, cache_dir: Path, output_dir: Path): ...
def run_extraction(combined_path: Path, cache_dir: Path, output_dir: Path): ...
def write_results(combined_path: Path, cache_dir: Path, output_dir: Path): ...

# RIGHT — grouped into a dataclass, passed once
from dataclasses import dataclass

@dataclass
class GaiaPaths:
    root: Path
    combined_traces_path: Path
    cache_dir: Path
    output_dir: Path

    @classmethod
    def from_root(cls, root: Path) -> "GaiaPaths":
        return cls(
            root=root,
            combined_traces_path=root / "data" / "combined.json",
            cache_dir=root / "cache",
            output_dir=root / "execution_results",
        )

def load_traces(paths: GaiaPaths) -> list[Trace]: ...
def run_extraction(paths: GaiaPaths) -> dict: ...
```

---

### Pattern 4 — Strategy / Protocol

**Detection trigger:** A function has `if/elif` chains or `isinstance()` checks
dispatching different implementations of the same operation based on a type or
string tag. Adding a new implementation requires editing the dispatch function.

**Required:** Define a `Protocol`. Each implementation is a class that satisfies
the Protocol. The dispatch chain is removed entirely.

```python
# WRONG — isinstance dispatch, must edit this function to add a new strategy
def normalize_tool(tool_name: str, strategy: str) -> str:
    if strategy == "exact":
        return EXACT_MAP.get(tool_name, tool_name)
    elif strategy == "fuzzy":
        return fuzzy_match(tool_name, TOOL_VOCAB)
    elif strategy == "llm":
        return llm_normalize(tool_name)

# RIGHT — Protocol + injected strategy, no dispatch chain
from typing import Protocol

class ToolNormalizer(Protocol):
    def normalize(self, tool_name: str) -> str: ...

class ExactNormalizer:
    def normalize(self, tool_name: str) -> str:
        return EXACT_MAP.get(tool_name, tool_name)

class FuzzyNormalizer:
    def normalize(self, tool_name: str) -> str:
        return fuzzy_match(tool_name, TOOL_VOCAB)

# Caller selects and injects the strategy — no dispatch in the function
def run_normalization(tools: list[str], normalizer: ToolNormalizer) -> list[str]:
    return [normalizer.normalize(t) for t in tools]
```

---

## Step 6: Directory Grouping Within a Layer

When a directory (typically `core/`) contains files that represent distinct
domain concepts, group them into subdirectories.

### When to create a subdirectory

Create a subdirectory when:
- 3 or more files share the same domain concept or responsibility
- Files in the same directory have no meaningful relationship to each other
- The directory name would need to be vague to cover what's in it

Do NOT create a subdirectory when:
- Only 1-2 files would go in it
- The grouping is by type (`classes/`, `helpers/`) rather than by concept
- The files genuinely belong at the same level

### How to name subdirectories

Name subdirectories after the **domain concept**, not the pattern or type.

```
# Wrong — grouping by type
core/
  classes/
  helpers/
  interfaces/

# Wrong — too granular
core/
  chamfer_distance_calculators/
  hausdorff_distance_calculators/

# Right — grouping by domain concept
core/
  evaluation/       ← all evaluation logic
  repair/           ← all repair loop logic
  parsing/          ← all CadQuery parsing logic
  data_loading/     ← all data loading logic
```

### Grouping rule

Before creating a subdirectory, answer: "What is the single concept that all
files in this subdirectory share?" If you can answer in 2-3 words, the grouping
is valid. If you can't, it's too broad or too narrow.

### Grouping is driven by the code, not by a template

Do not apply a fixed structure to every module. Apply structure when the code
actually needs it. A small module with 3 core files does not need subdirectories.
A larger module with 8+ core files almost certainly does.

---

## Before Writing Code — Design Checklist (Step 7)

Run through this before writing any class or organizing any directory.

**Class design:**
- [ ] Does this belong in a class or a function? (Use Step 1 criteria)
- [ ] What is this class's single responsibility? (State it in one sentence)
- [ ] What does this class depend on? Can those dependencies be injected?
- [ ] Is there more than one implementation of this behavior? Should there be
  an ABC or Protocol?
- [ ] Is this a data container? Use `@dataclass`.
- [ ] Am I using inheritance when I should be using composition?

**SOLID:**
- [ ] S: Does this class have one reason to change?
- [ ] O: Am I using `isinstance` chains instead of polymorphism?
- [ ] L: Do my subclasses honor the parent's full contract?
- [ ] I: Is my ABC/Protocol focused, or forcing unused methods on implementors?
- [ ] D: Am I instantiating concrete classes inside `__init__`?

**Directory grouping:**
- [ ] Does this directory have files from distinct domain concepts mixed together?
- [ ] Are there 3+ files that share a concept and should be grouped?
- [ ] Are subdirectory names based on domain concepts, not types or patterns?

**Named OOP pattern check:**
- [ ] No function loads from disk (JSON, YAML, DB) more than once per execution path without a Registry class holding the result.
- [ ] No module-level or loosely-scoped cache dict — caches are `self._cache` on a class that owns load, lookup, and save.
- [ ] No 3+ related Path or config values passed as separate function arguments — grouped into a `@dataclass`.
- [ ] No `isinstance()` dispatch chain or `if/elif` on a type tag — replaced with a Protocol and injected strategy.

---

## What This Skill Does NOT Cover

- Which layer a file belongs to → `SKILL: design-layered-module`
- Creating the module base structure → `SKILL: create-module`
- Notebook design → `SKILL: design-feature-notebook`
- Runner orchestration patterns → `SKILL: design-runner`

---

## Related Skills

* `SKILL: design-layered-module` — run first to establish layer structure; this
  skill runs within that structure
* `SKILL: create-module` — base scaffolding; this skill designs the internals
* `SKILL: refactor-module` — use together when refactoring existing code to
  apply these principles retroactively