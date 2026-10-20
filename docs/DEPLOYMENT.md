# Deployment and Release Rules

## Target
Vercel is the intended deployment platform, provided the existing framework and runtime are compatible. Inspect the current project configuration rather than assuming.

## Before deployment
- [ ] Local build passes, or remaining limitations are explicitly reviewed.
- [ ] Relevant tests and type checks have been run where available.
- [ ] Correct repository, branch, project, and domain are identified.
- [ ] Required environment variable NAMES are documented without secret values.
- [ ] Production environment values are configured securely by the owner.
- [ ] Production database is reachable and schema is ready.
- [ ] No production migration will run without approval.
- [ ] Secrets are absent from the commit.
- [ ] Known limitations and rollback options are reported.

## Permission gate: push
The agent must stop and show the proposed branch, remote, commit scope, and verification results. It must ask for explicit approval before pushing. Push approval is not deployment approval.

## Permission gate: deploy
The agent must stop and show the target Vercel project/domain, source commit, build/test status, configuration readiness, and known risks. It must ask for explicit approval before deploying. No response means no deployment.

## After deployment approval
- Record the actual Vercel result and URL.
- Verify the live app, menu, core APIs, database operations, and access control.
- Use test payment mode unless live payment testing is separately authorized.
- Do not create real charges or destructive production data without explicit permission.

## Rollback
If the release is broken, report symptoms and propose a rollback or fix. Do not make destructive production changes or initiate an unapproved deployment.
