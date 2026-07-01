---
name: codebase-design
description: >
  Enforces codebase structure, modularity, and reuse rules for this project.
  Use when generating new code, adding features, refactoring, creating files,
  or extending existing modules. Triggers on "add", "create", "implement",
  "refactor", "extend", "write a function", "new module", "new pipeline".
user-invocable: false
---

# Codebase Design

## Folder Responsibilities

| Folder | Owns |
|---|---|
| `utils/` | Shared infrastructure: DB, LLM, execution, config loading |
| `config/` | Declarative experiment configuration only |
| `dataset_creation/` | Data generation and DB writes |
| `code_generation/` | Inference, prompting, RAG, repair, evaluation pipelines |
| `analytics/` | Read-only analysis and visualization |
| `cad_code_generation/` | CAD-specific generation, evaluation, RAG |

Never mix responsibilities across folders. No DB writes in analytics. No plotting in utils. No pipeline logic in notebooks.

---

## Before Writing Any Code

1. Search `utils/` for existing implementations
2. Search the local folder for similar functions
3. If it exists → reuse or extend
4. If it does not exist → create a minimal, focused module

---

## Canonical Utilities — Always Use These

- DB reads → `utils/db/reader.py`
- DB writes / ORM → `utils/db/utilities/db_handler.py`
- LLM calls → `utils/llm/llm.py` via `LLMConnector`
- Code execution → `utils/evaluation/python_kernel.py`
- Config loading → `config_loader.py`

Never reimplement these. Never create new provider wrappers for LLM.

---

## Notebook Rules

Notebooks are readable runners — not black-box callers, not self-contained pipelines.

The goal is that someone reading the notebook can follow what is happening step by step, without needing to open the `.py` files to understand the flow.

Allowed:
- Define parameters or SQL queries
- Call Python modules with intermediate results captured and inspected
- Print or display intermediate outputs between steps to show what is happening
- Short inline comments explaining why a step is being done
- Basic visualization
- Inline assertions or sanity checks on data/outputs

Not allowed:
- DB connection or write logic
- LLM client setup
- Core pipeline logic (loops, retries, error handling) defined inside the notebook
- Duplicated utilities
- Wrapping all steps into a single `run_pipeline()` call with no visibility into stages

Pattern to follow:
```python
# Load experiment config
config = load_config("config/qwen_baseline.yaml")

# Fetch candidate programs from DB
df = read_sql(CANDIDATE_QUERY, config)
print(f"Loaded {len(df)} candidates")

# Run evaluation
results = evaluate_programs(df, config)
display(results.head())

# Write results
save_results(results, config)
```

Not this:
```python
run_pipeline(config_path="config/qwen_baseline.yaml")
```

Move reusable logic into `.py` modules. Keep the notebook as the visible, inspectable record of what ran and what the outputs looked like.

---

## Python Module Rules

- Each file has one clear responsibility
- Functions are small and single-purpose
- Explicit naming over clever naming
- No deep class hierarchies unless clearly necessary
- No deeply nested abstractions

---

## Config Rules

- One config file per model
- Use `variants` for baseline vs RAG differences
- Do not create `*_rag.yaml` unless variants are insufficient
- Always load via `config_loader.py`
- No logic inside config files — declarative only
- No hardcoded model settings, endpoints, or table names in scripts

---

## Database Pattern

- SQL queries stay visible in the caller (notebook or feature module)
- Execution goes through shared utilities only
- Do not embed business-specific SQL inside `utils/`
- Use parameterized queries

---

## Canonicalization

When the same functionality exists in multiple places:
1. Identify all implementations
2. Keep one canonical version
3. Remove or merge the rest

Do not leave: `_original`, `_v2`, `_pipeline` suffixes, or parallel implementations.

---

## Refactoring Rules

- Preserve behavior unless explicitly changing it
- Update all callers when changing structure
- Do not leave partial migrations
- Remove dead code, unused functions, redundant wrappers

---

## Analytics Rules

- Read-only: never write to DB, never run generation pipelines
- SQL must be visible in the notebook or caller
- Use shared DB reader
- Do not use invalid metrics (e.g., IoGT)

---

## File Creation Rules

- Fewer files over more files
- Do not fragment logic into many small helpers unless reused in 2+ places
- No `_v2`, `_new`, `_copy` files — resolve the canonical version

---

## Decision Heuristics

When unsure, ask in order:
1. Does this already exist in `utils/`?
2. Is this logic reused across multiple modules?
3. Does this belong in the correct folder by purpose?
4. Am I making the codebase simpler or more complex?

Default to: fewer files, reuse existing code, explicit over implicit, one correct implementation over many similar ones.