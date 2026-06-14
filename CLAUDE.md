# CLAUDE.md — create-openfigs (the `npm create openfigs` scaffolder)

This repo is the **open, MIT-licensed installer** for [OpenFigs](https://github.com/figs-so/openfigs):
one command (`npm create openfigs my-agent`) scaffolds a single AI-employee agent. It is the **build
on-ramp** in the Figs stack (build → report → govern). Tests: `npm test` (`node --test`). Releasing:
see `CONTRIBUTING.md`.

## What it does (the five steps `index.mjs` owns)

1. **Fetches the OpenFigs skeleton at runtime** from `github:figs-so/openfigs` (override with
   `--from` or `OPENFIGS_SOURCE`) — zero-dependency: Node `fetch` + the GitHub tarball + `tar`.
2. **Regenerates the cross-runtime symlinks** — `CLAUDE.md` → `AGENTS.md` and `.claude/skills` →
   `.agents/skills` — so Claude Code, Codex, and opencode read one source of truth.
3. **Stamps the agent's name** into the skeleton's placeholders.
4. **Runs `figs init --yes`** (account-free) so the clone has a local identity + activity journal,
   ready to work with no account. `--yes` confirms Figs is a fit — choosing `npm create openfigs` IS
   that decision (init's first-time fit gate is for bare `figs init` elsewhere). Skip with `--no-init`.
5. **`git init`s the repo** + a first commit ("a clone is yours" should literally be a repo — the
   skeleton commits config/agent/CONTRACT, and sandboxed runtimes won't refuse a non-repo dir).
   **Skipped if `<dir>` lands inside an existing repo** (e.g. `--here` in a monorepo) — never nests.

## Invariants (NEVER break these)

1. **Zero dependencies, one entry file.** `index.mjs` + `lib/` only — Node `fetch`/`tar`, nothing
   from npm. Keep the flag surface small.
2. **The skeleton is fetched, never bundled.** New agents always get the latest openfigs. **This
   package is released only when the scaffolder logic changes** — never because openfigs changed.
3. **Symlinks are regenerated deterministically**, never shipped as files. This is the whole reason
   a scaffolder beats a ZIP/`degit` — a symlink committed as text would break on the user's machine.
4. **One fresh identity per scaffold.** `figs init` mints a new `agentId` per clone; identity is
   **never** baked into the skeleton. So two scaffolds never collide — and **a copied folder carries
   the original's identity**. Never instruct anyone to copy a scaffolded agent to make another;
   scaffold fresh. (Rotate a mistakenly-copied identity with `rm -rf .figs && figs init --yes`; the
   server also refuses a push whose `name` differs from the one registered for that `agentId`.)
5. **Account-free by default.** Scaffolding + `figs init` complete with no Figs account and no
   network beyond the skeleton fetch. Login/link/push are the user's later, opt-in steps.

## Working rules

- **Match the sibling repos' house style** — terse, agent-first, deterministic output.
- `CLAUDE.md` is canonical; `AGENTS.md` is a symlink to it — **never edit the symlink**.
- Keep `README.md` standalone and carrying the **Figs ecosystem** cross-link block (every public
  repo does), so the whole stack is visible from this entry point.
- `.claude/` is local tooling state — gitignored, never published.
