# create-openfigs

**Scaffold one [OpenFigs](https://github.com/figs-so/openfigs) employee in one line.**

```bash
npm create openfigs@latest my-agent
```

OpenFigs is a small, file-based skeleton for building one back-office **AI employee** — an agent
that owns a recurring job, learns from its work, and reports to a human through
[Figs](https://app.figs.so). This is its installer.

## What it does

```bash
npm create openfigs@latest [dir]
# or
npx create-openfigs [dir] [--yes] [--here] [--from <source>] [--no-init]
```

1. **Fetches the current OpenFigs skeleton** into `dir` (defaults to `my-agent`; prompts if
   omitted) — straight from [`figs-so/openfigs`](https://github.com/figs-so/openfigs) at runtime,
   so you always get the latest.
2. **Regenerates the runtime symlink** — `CLAUDE.md` → `AGENTS.md` (and `.claude/skills` →
   `.agents/skills`) — so Claude Code, Codex, and opencode all read one source of truth. (This is
   why a scaffolder beats a plain ZIP download: the link is rebuilt deterministically, never
   shipped as a broken text file.)
3. **Stamps the agent's name** into the skeleton's placeholders.
4. **Runs `figs init`** (account-free, zero-flag) — so the agent has a **local identity + activity
   journal** and is ready to work with no account. (Identity is minted here, per clone — never
   shipped in the skeleton, so two agents never collide. Skip with `--no-init`.)

Then:

```bash
cd my-agent
# read AGENTS.md, fill your charter in .figs/agent.json (role, mandate, department)
# work — figs records you locally from day one (no account needed)
# when your team should see it:
npx @figs-so/cli@latest login    # opens your browser — sign up & approve
npx @figs-so/cli@latest link     # join a workspace
npx @figs-so/cli@latest push     # appear on the org chart
```

> **One repo = one employee.** Want a team? Run this once per job and point them at the **same Figs
> workspace** — the org chart groups them by each agent's `department`. **Never copy a scaffolded
> folder** to make another (a copy carries the original's identity); scaffold fresh so each mints
> its own.

### Options

| Flag | What |
|---|---|
| `--from <source>` | skeleton source: `github:owner/repo[#ref]` or a local path (default: `github:figs-so/openfigs`; or set `OPENFIGS_SOURCE`) |
| `--here` | scaffold into the current directory |
| `--no-init` | skip running `figs init` (you'll run it yourself) |
| `-y`, `--yes` | non-interactive (no prompts) |
| `-h`, `--help` | usage |

Prefer the raw skeleton with no init/prompts? `npx degit figs-so/openfigs my-agent`.

## How the skeleton is fetched (always current)

The skeleton is **not bundled** here — it's fetched from the canonical
[`openfigs`](https://github.com/figs-so/openfigs) repo **at runtime** (zero-dependency: Node
`fetch` + the GitHub tarball + `tar`). So new agents always get the latest skeleton, and this
package only needs a release when the *scaffolder logic itself* changes — never just because
openfigs changed.

Point it elsewhere with `--from` (a fork, a pinned `#tag`, or a local checkout):

```bash
npx create-openfigs my-agent --from github:me/openfigs-fork#v1.2.0
npx create-openfigs my-agent --from ../openfigs          # local path (offline / dev)
```

**Developing locally** (with the `openfigs` repo as a sibling directory):

```bash
npm test     # smoke-test against ../openfigs (no network): scaffold + assert the live symlink
```

## License

MIT. By contributing, you agree your contributions are MIT-licensed.
