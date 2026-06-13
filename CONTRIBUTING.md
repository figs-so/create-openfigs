# Contributing to create-openfigs

Thanks for your interest. This repo is **`create-openfigs`** — the one-line installer that scaffolds
a single [OpenFigs](https://github.com/figs-so/openfigs) employee (`npm create openfigs my-agent`).
It's **MIT-licensed**. (The hosted app at [app.figs.so](https://app.figs.so) is a separate,
closed-source commercial product.)

This is intentionally a **small, zero-dependency** package: it fetches the OpenFigs skeleton at
runtime, regenerates the cross-runtime symlinks, stamps the agent's name, and runs `figs init`.
Issues, ideas, and PRs are welcome.

## Ways to contribute

- **Report a bug or propose an idea** — open an issue.
- **The scaffolder (`index.mjs` + `lib/`)** — a single, **zero-dependency** Node file (Node ≥ 18):
  Node `fetch` + the GitHub tarball + `tar`, nothing else. Keep it that way.

## What this package is — and is NOT

- It is the **installer**, not the skeleton. The skeleton is **not bundled** — it's fetched from
  [`figs-so/openfigs`](https://github.com/figs-so/openfigs) at runtime, so new agents always get the
  latest. **This package only needs a release when the *scaffolder logic itself* changes** — never
  because openfigs changed.
- The reason a scaffolder beats a plain ZIP/`degit`: it **regenerates the runtime symlinks**
  (`CLAUDE.md` → `AGENTS.md`, `.claude/skills` → `.agents/skills`) deterministically, and **mints a
  fresh identity per clone** via `figs init` — so two agents never collide. Preserve both
  invariants in any change.

## Running locally

```bash
npm test     # smoke-test against a sibling ../openfigs checkout (no network):
             # scaffold a fresh fleet + assert the live symlink and a working first agent
```

Point the scaffolder at an alternate skeleton source while developing:

```bash
node index.mjs my-agent --from ../openfigs          # local path (offline / dev)
node index.mjs my-agent --from github:me/fork#v1.2.0 # a fork or pinned ref
```

## Guidelines

- Keep the package **zero-dependency** and the flag surface **small**.
- **Never break the two invariants above** — deterministic symlink regeneration, and one fresh
  identity per scaffold (never copy a scaffolded folder; scaffold fresh).
- Match the surrounding style; be kind in reviews and issues.

## Releasing (`create-openfigs`)

Publishing is automated by `.github/workflows/publish.yml` — maintainers don't run `npm publish` by
hand.

1. Bump `"version"` in **`package.json`** (semver: scaffolder fixes = patch/minor, a flag/behavior
   break = major). Release **only when the scaffolder logic changed** — not just because openfigs did.
2. Commit, then tag and push: `git tag vX.Y.Z && git push --tags` (the tag must match `package.json`).
3. Publish a **GitHub Release** for that tag → the workflow verifies tag == version and runs
   `npm publish --access public`.

Auth is npm **Trusted Publishing** (OIDC) — no token/secret. It's configured once at
npmjs.com → `create-openfigs` → Trusted Publisher (GitHub Actions · org `figs-so` · repo
`create-openfigs` · workflow `publish.yml`). Provenance is attached automatically.

## License

By contributing, you agree that your contributions are licensed under the **MIT License**.
