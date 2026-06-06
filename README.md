# create-openfigs

**Scaffold a new [OpenFigs](https://github.com/figs-so/openfigs) fleet in one line.**

```bash
npm create openfigs@latest my-fleet
```

OpenFigs is a small, file-based skeleton for building back-office **AI-employee** agents — agents
that own a recurring job, learn from their work, and report to a human through
[Figs](https://app.figs.so). This is its installer.

## What it does

```bash
npm create openfigs@latest [dir]
# or
npx create-openfigs [dir] [--agent <name>] [--yes] [--here]
```

1. **Fetches the current OpenFigs skeleton** into `dir` (defaults to `my-fleet`; prompts if
   omitted) — straight from [`figs-so/openfigs`](https://github.com/figs-so/openfigs) at runtime,
   so you always get the latest.
2. **Regenerates the runtime symlinks** — `CLAUDE.md` → `AGENTS.md` and
   `.claude/skills` → `.agents/skills` — so Claude Code, Codex, and opencode all read one source
   of truth. (This is why a scaffolder beats a plain ZIP download: the links are rebuilt
   deterministically, never shipped as broken text files.)
3. Optionally scaffolds your **first agent**, reusing the skeleton's own `new-agent` logic.

Then:

```bash
cd my-fleet
# read AGENTS.md, fill in agents/<name>/AGENTS.md, add more with `npm run new-agent <name>`
npx @figs-so/cli@latest login && npx @figs-so/cli@latest init   # connect to Figs
```

### Options

| Flag | What |
|---|---|
| `--agent <name>` | also scaffold a first agent (snake_case; nesting ok: `dept/name`) |
| `--from <source>` | skeleton source: `github:owner/repo[#ref]` or a local path (default: `github:figs-so/openfigs`; or set `OPENFIGS_SOURCE`) |
| `--here` | scaffold into the current directory |
| `-y`, `--yes` | non-interactive (no prompts; skips the agent unless `--agent` is given) |
| `-h`, `--help` | usage |

> **`npm create` + flags:** because `npm create` parses some args itself, separate flags with `--`:
> `npm create openfigs@latest my-fleet -- --agent revenue_ops`. With `npx` no `--` is needed.

Prefer the raw skeleton with no prompts? `npx degit figs-so/openfigs my-fleet`.

## How the skeleton is fetched (always current)

The skeleton is **not bundled** here — it's fetched from the canonical
[`openfigs`](https://github.com/figs-so/openfigs) repo **at runtime** (zero-dependency: Node
`fetch` + the GitHub tarball + `tar`). So new fleets always get the latest skeleton, and this
package only needs a release when the *scaffolder logic itself* changes — never just because
openfigs changed.

Point it elsewhere with `--from` (a fork, a pinned `#tag`, or a local checkout):

```bash
npx create-openfigs my-fleet --from github:me/openfigs-fork#v1.2.0
npx create-openfigs my-fleet --from ../openfigs          # local path (offline / dev)
```

**Developing locally** (with the `openfigs` repo as a sibling directory):

```bash
npm test     # smoke-test against ../openfigs (no network): scaffold + assert live symlinks
```

## License

MIT. By contributing, you agree your contributions are MIT-licensed.
