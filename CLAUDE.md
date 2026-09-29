# CLAUDE.md

@AGENTS.md

## Claude Code notes
- Start each session by reading the current milestone in `docs/ROADMAP.md` and the last 10 log lines of `docs/PROGRESS.md`.
- Load only the doc sections a task needs. TRD section numbers are stable for this reason.
- For any task that touches more than two packages under `synth/`, propose a short plan and wait for approval before editing.
- If the same test fails twice for the same reason, stop. Write the blocker to PROGRESS.md instead of trying unrelated fixes.
- Run tests with `OFFLINE_MODE=1`. The test suite must never call a live LLM.
- Before finishing, re-read the "Hard invariants" list in AGENTS.md and confirm the change respects each one.
