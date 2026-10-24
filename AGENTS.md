# AGENTS.md — Working Rules for SyStats

This file is the contract for any agent (or human) doing work in this repo.
Read `DESIGN.md` first, then this file. Never skip either.

## 1. Ground truth (read order)

1. `DESIGN.md` — the design document. It is the source of truth for scope,
   metrics, UI tokens (section 6), and architecture (section 7).
2. `tasks/` — one file per task, numbered. Work happens **in task-id order**
   unless dependencies explicitly say otherwise.
3. This file — the process rules.

## 2. Task workflow (mandatory)

For every task file in `tasks/`:

1. **Read** the task file fully before writing any code. Check `Status`,
   `Depends on`, and the previous task's `Report` for known pitfalls.
2. **Implement** exactly what the task's `Objective` and `Steps` describe.
   Improvements discovered along the way go in the task's `Report` under
   "Deviations", never as silent scope creep.
3. **Self-test** (machine): run lint, build, and the task's declared test
   commands. Code must be green before you continue.
4. **Human test** (manual): perform the task's "Human test" steps yourself as
   far as a headless/agent environment allows. Where you cannot (no live GNOME
   session, no GPU), say so explicitly in the report and leave the manual
   steps for the user.
5. **Write the report**: fill in the `Report` section at the bottom of the
   task file using the template. Every field required, "n/a with reason"
   counts as filled.
6. **Stop after one task.** Do not chain into the next task in the same
   run unless the user asked for it. The user verifies between tasks.

## 3. Report template (copy into the task's Report section)

```
### Report

- **Date:** <yyyy-mm-dd>
- **Status:** <done | partial | blocked>
- **What was done:** <2-6 concrete bullet points>
- **Deviations from plan:** <anything that differs from Steps/DESIGN.md, else "none">
- **Self-test results:** <commands run + pass/fail each>
- **Manual steps left for user:** <the human-test steps an agent cannot do, else "none">
- **Known issues / follow-ups:** <bugs accepted, corners cut, TODO refs>
```

## 4. Product rules (summaries, details in DESIGN.md)

- GNOME Shell extension is **ESM only** (GNOME 45+). No `imports`, no
  `Lang.bind`, no legacy `const Mainloop` (use `GLib.timeout_add`).
- Only these modules may touch privileged APIs: `extension/`, `helper/`,
  `overlay/`. Extension code must pass the GNOME extensions review rules
  (no eval, no `Gio.Subprocess` against untrusted input, clean
  enable/disable, no leaks on toggle >= 1 time).
- UI must follow the token system in DESIGN.md section 6 exactly:
  surface `#16181d`, accent `#5ac8ea` (single accent, live-data only),
  warn `#f0b429`, crit `#ef5f5f`, hairlines not cards, monospace tabular
  numerals only, radius lock 12/8, zero em-dashes in any user-visible string.
- Motion budget (DESIGN.md 6.4) is a hard cap. Any new entry/pulse animation
  needs a motivated row in that table.
- All metric reads degrade gracefully: an unavailable source renders "n/a"
  with a tooltip reason, never a fake zero.
- Polling work must not block the main loop: async reads or reused GTop
  structs; preallocate history ring buffers (`Float32Array`), no per-tick
  allocations on the hot path.

## 5. Validation ladder (run in order, fix before continue)

1. `meson setup build && ninja -C build` (or `npm`/`cargo` equivalents per
   subproject) — everything compiles.
2. `ninja -C build test` — unit tests pass (GJS `node:test` compat, cargo test).
3. Lint: `eslint .` (gjs config) / `cargo clippy`.
4. Extension toggle hygiene:
   `gnome-extensions enable/disable <id>` x3 with `journalctl` clean of errors.
5. Only then run the task's human test.

## 6. Git and remote policy

- Do not commit without the user asking.
- The project remote is `git@github.com:SlyHammad18/nimbus.git`. Push only
  after asking the user first and getting a yes.
- Commit messages must NOT include any co-author trailer (no
  `Co-authored-by:` line at all, including the CommandCode one).

## 7. Do not

- Do not edit completed tasks (except appending an addendum note in the report).
- Do not create new top-level directories without updating DESIGN.md §8.
- Do not commit without the user asking.
- Do not leave a dev server, nested shell, or background job running when done.
- Do not touch `.commandcode/taste/` ever.
