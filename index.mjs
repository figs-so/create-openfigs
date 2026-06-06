#!/usr/bin/env node
/**
 * create-openfigs — scaffold a new OpenFigs fleet in one line.
 *
 *   npm create openfigs@latest [dir]
 *   npx create-openfigs [dir] [--agent <name>] [--yes] [--here] [--from <source>]
 *
 * Fetches the *current* OpenFigs skeleton (from github:figs-so/openfigs by default) into <dir>,
 * regenerates the runtime symlinks (CLAUDE.md -> AGENTS.md, .claude/skills -> .agents/skills),
 * and optionally scaffolds the first agent by reusing the skeleton's own scripts/new-agent.mjs.
 *
 * Runtime-fetch (not bundled), so new users always get the latest skeleton — this package only
 * changes when the scaffolder logic does. Zero dependencies (Node fetch + system tar). Node >= 18.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execSync, execFileSync } from "node:child_process"
import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { enforceSymlinks } from "./lib/symlinks.mjs"

const DEFAULT_SOURCE = "github:figs-so/openfigs"
const AGENT_RE = /^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)*$/

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
})

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) return usage()

  // Validate a flag-supplied agent name before touching the filesystem (fail fast, write nothing).
  if (opts.agent && !AGENT_RE.test(opts.agent))
    throw new Error(`"${opts.agent}" isn't a valid agent name (snake_case; nesting ok: dept/name).`)

  const source = opts.from || process.env.OPENFIGS_SOURCE || DEFAULT_SOURCE
  const interactive = !opts.yes && stdin.isTTY
  const rl = interactive ? readline.createInterface({ input: stdin, output: stdout }) : null
  try {
    // 1. Where to scaffold.
    let dir = opts.dir
    if (!dir && opts.here) dir = "."
    if (!dir && rl) dir = (await rl.question("Fleet directory (e.g. my-fleet): ")).trim()
    if (!dir) dir = "my-fleet"
    const target = path.resolve(dir)

    if (fs.existsSync(target) && fs.readdirSync(target).length > 0)
      throw new Error(`target ${rel(target)} already exists and isn't empty — pick another directory.`)

    // 2. Fetch the current skeleton, then regenerate symlinks deterministically.
    console.log(`\nScaffolding an OpenFigs fleet in ${rel(target)} …`)
    await obtainSkeleton(source, target)
    const links = enforceSymlinks(target)
    console.log(`  ✔ skeleton fetched${links.length ? ` + ${links.length} symlink(s) repaired` : ""}`)

    // 3. First agent (reuse the skeleton's canonical scaffolder).
    let agent = opts.agent
    if (!agent && rl) {
      const ans = (await rl.question("Name your first agent (snake_case), or Enter to skip: ")).trim()
      agent = ans || null
    }
    if (agent) {
      if (!AGENT_RE.test(agent)) throw new Error(`"${agent}" isn't a valid agent name (snake_case; nesting ok: dept/name).`)
      execFileSync("node", ["scripts/new-agent.mjs", agent], { cwd: target, stdio: "inherit" })
    }

    nextSteps(dir, agent)
  } finally {
    rl?.close()
  }
}

/**
 * Populate `dir` with the OpenFigs skeleton. `source` is either a local path (a checkout — used
 * for dev, forks, and offline tests) or a `github:owner/repo[#ref]` reference fetched at runtime.
 */
async function obtainSkeleton(source, dir) {
  const local = localPath(source)
  if (local) return copyLocal(local, dir)
  return fetchGitHub(source, dir)
}

function localPath(source) {
  if (/^(github:|gh:|gitlab:|bitbucket:|https?:)/.test(source)) return null
  const raw = source.startsWith("file:") ? source.slice("file:".length) : source
  const resolved = path.resolve(raw.startsWith("~") ? raw.replace(/^~/, os.homedir()) : raw)
  return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? resolved : null
}

function copyLocal(src, dir) {
  fs.mkdirSync(dir, { recursive: true })
  if (fs.existsSync(path.join(src, ".git"))) {
    // The committed tree only (honors the source's .gitignore — no .env, no .figs logs).
    execSync(`git -C "${src}" archive --format=tar HEAD | tar -x -C "${dir}"`, { stdio: "inherit", shell: "/bin/sh" })
  } else {
    // Skip symlinks — enforceSymlinks regenerates them.
    fs.cpSync(src, dir, { recursive: true, filter: (s) => !fs.lstatSync(s).isSymbolicLink() })
  }
}

async function fetchGitHub(source, dir) {
  const [repoPart, ref = "main"] = source.replace(/^(github:|gh:)/, "").split("#")
  const [owner, repo] = repoPart.split("/")
  if (!owner || !repo)
    throw new Error(`can't parse source "${source}" — expected github:owner/repo[#ref] or a local path.`)

  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`
  console.log(`  fetching ${owner}/${repo}#${ref} …`)
  const res = await fetch(url)
  if (!res.ok)
    throw new Error(
      `couldn't fetch ${url} (HTTP ${res.status}).\n` +
        `  is ${owner}/${repo} public yet? for a private/fork/local source, pass --from <owner/repo|path>.`
    )

  fs.mkdirSync(dir, { recursive: true })
  const tgz = path.join(os.tmpdir(), `openfigs-${process.pid}.tgz`)
  fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()))
  try {
    // GitHub wraps everything in a top-level <repo>-<ref>/ dir; strip it.
    execFileSync("tar", ["-xzf", tgz, "-C", dir, "--strip-components=1"], { stdio: "inherit" })
  } finally {
    fs.rmSync(tgz, { force: true })
  }
}

function parseArgs(argv) {
  const opts = { dir: null, agent: null, from: null, yes: false, here: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--help" || a === "-h") opts.help = true
    else if (a === "--yes" || a === "-y") opts.yes = true
    else if (a === "--here") opts.here = true
    else if (a === "--agent") opts.agent = argv[++i]
    else if (a.startsWith("--agent=")) opts.agent = a.slice("--agent=".length)
    else if (a === "--from") opts.from = argv[++i]
    else if (a.startsWith("--from=")) opts.from = a.slice("--from=".length)
    else if (!a.startsWith("-") && !opts.dir) opts.dir = a
    else throw new Error(`unknown argument: ${a}  (try --help)`)
  }
  return opts
}

function nextSteps(dir, agent) {
  const cd = dir === "." ? "" : `cd ${dir}\n  `
  console.log(`\n✔ Done. Next:\n`)
  console.log(`  ${cd}# read AGENTS.md — the operating guide every agent inherits`)
  if (agent) console.log(`  # fill in agents/${agent}/AGENTS.md — its role, mandate, and the loop it runs`)
  else console.log(`  npm run new-agent <name>   # scaffold your first agent`)
  console.log(`  # connect to Figs so your manager can see it:`)
  console.log(`  npx @figs-so/cli@latest login && npx @figs-so/cli@latest init\n`)
}

function usage() {
  console.log(`create-openfigs — scaffold a new OpenFigs fleet

Usage:
  npm create openfigs@latest [dir]
  npx create-openfigs [dir] [options]

Options:
  --agent <name>   also scaffold a first agent (snake_case; nesting ok: dept/name)
  --from <source>  skeleton source: github:owner/repo[#ref] or a local path
                   (default: ${DEFAULT_SOURCE}; or set OPENFIGS_SOURCE)
  --here           scaffold into the current directory
  -y, --yes        non-interactive (no prompts; skips the agent unless --agent is given)
  -h, --help       show this help
`)
}

function rel(p) {
  const r = path.relative(process.cwd(), p)
  return r === "" ? "." : r
}
