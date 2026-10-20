# Agent Workflow

## Core loop
Inspect → Plan → Implement one small checkpoint → Test → Fix → Report → Stop and wait.

## Required status
- `PASS`: required work and checks completed with evidence.
- `BLOCKED`: cannot proceed safely or required dependency/permission is missing.
- `NEEDS REVIEW`: results or risks require owner decision.

## Checkpoint report
**Checkpoint:** ID and name  
**Status:** PASS / BLOCKED / NEEDS REVIEW  
**Files inspected/changed:** actual paths  
**Implementation:** concise summary  
**Verification:** commands run and actual outcomes  
**Errors/risks:** known issues, including pre-existing issues  
**Next checkpoint:** one next action  
**Permission required:** exact action, YES/NO

## Stop conditions
Stop and ask the owner when:
- a required secret or external account is unavailable;
- a test/build error cannot be safely resolved;
- the change would require broad architectural changes;
- production data, migrations, destructive operations, paid services, or live payments are involved;
- push or deployment is about to occur;
- requirements conflict or an important assumption is unclear.

## Deadline policy
If the deadline is under one hour, prioritize existing working code and the smallest demonstrable end-to-end path. Do not create a large backlog of new features. A truthful limited MVP is better than a broad, broken implementation.
