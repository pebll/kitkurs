# category-rules

## Objective
1. FoS Additive requirement becomes dynamic instead of a fixed 36 CP.
2. Catalog gets a "Hide planned courses" checkbox.

## Rule
requiredAdditive = max(0, 60 - max(general, 16) - max(methodical, 8)).
Allocation per course in plan order (soft limits: may add while under the limit):
thesis / interdisciplinary unchanged; if the course matches the FoS and the FoS pool
(methodical + general + additive) < 60: methodical (<8) > general (<16) > additive >
general (extra) > methodical (extra); else elective area (<22); else uncounted.

## Tooling
- TDD: strict (session config). Runner: `node --test tests/`; Python: `python3 -m unittest discover -s tests`.
- Route: delegated direct worker (single writer).

## Tasks
- [x] T1 Pure allocator `web_visu/assets/js/utils/categoryAllocation.js` + `tests/categoryAllocation.test.js` (RED: module missing, 8 pass/1 fail file error; GREEN: 25 pass, 0 fail)
- [x] T2 planner.js uses the allocator (label, totals, details modal, dynamic additive requirement); planner.html loads the script
- [x] T3 "Hide planned courses" checkbox (index.html, simple-modular.js) using `plannedCourseNames`

## Evidence
- Browser (Playwright): General 20 CP, Additive requirement 32 (= 60 - 20 - 8), no page errors.
- Catalog: 292 -> 287 courses with 5 planned, planned names absent, restored on uncheck.

## Commits
See `git log feature/category-rules`.
