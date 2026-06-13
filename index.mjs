#!/usr/bin/env node
/**
 * create-openfigs — scaffold one OpenFigs employee in one line.
 *
 *   npm create openfigs@latest [dir]
 *   npx create-openfigs [dir] [--yes] [--here] [--from <source>] [--no-init]
 *
 * Fetches the current OpenFigs skeleton into <dir>, regenerates the runtime symlink
 * (CLAUDE.md -> AGENTS.md, .claude/skills -> .agents/skills), stamps the agent's name, and runs
 * `figs init` (account-free) so the agent has a local identity + journal and is ready to work.
 *
 * One repo = one employee. For a team, run this once per job and point them at the same Figs
 * workspace — the org chart draws itself. NEVER copy a scaffolded folder to make another (a copy
 * carries the original's identity); scaffold fresh each time so each one mints its own.
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
// The files that carry the <AGENT_NAME> placeholder the skeleton ships with.
const NAME_FILES = ["AGENTS.md", "MEMORY.md", "SANITY.md", ".figs/agent.json", ".figs/CONTRACT.md"]

main().catch((err) => {
  console.error(`\n✖ ${err.message}`)
  process.exit(1)
})

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) return usage()

  const source = opts.from || process.env.OPENFIGS_SOURCE || DEFAULT_SOURCE
  const interactive = !opts.yes && stdin.isTTY
  const rl = interactive ? readline.createInterface({ input: stdin, output: stdout }) : null
  try {
    // 1. Where to scaffold — the directory IS the employee.
    let dir = opts.dir
    if (!dir && opts.here) dir = "."
    if (!dir && rl) dir = (await rl.question("Agent name / directory (e.g. reconciliation): ")).trim()
    if (!dir) dir = "my-agent"
    const target = path.resolve(dir)
    const name = path.basename(target)

    if (fs.existsSync(target) && fs.readdirSync(target).length > 0)
      throw new Error(`target ${rel(target)} already exists and isn't empty — pick another directory.`)

    // 2. Fetch the current skeleton, then regenerate the symlink(s) deterministically.
    console.log(`\nScaffolding an OpenFigs employee in ${rel(target)} …`)
    await obtainSkeleton(source, target)
    const links = enforceSymlinks(target)
    console.log(`  ✔ skeleton fetched${links.length ? ` + ${links.length} symlink(s) wired` : ""}`)

    // 3. Stamp the agent's name into the skeleton's placeholders.
    substituteName(target, name)

    // 4. Mint a local identity + journal (account-free). Best-effort — degrade with a clear hint.
    const inited = opts.noInit ? null : runInit(target)

    nextSteps(dir, name, inited)
  } finally {
    rl?.close()
  }
}

/** Replace <AGENT_NAME> with the agent's name in the files the skeleton ships with it. */
function substituteName(target, name) {
  for (const f of NAME_FILES) {
    const p = path.join(target, f)
    if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, "utf8").replaceAll("<AGENT_NAME>", name))
  }
}

/**
 * Run `figs init` (account-free, zero-flag) in the new repo so it has a fresh identity + journal.
 * Best-effort: returns true if it ran, false if it couldn't (offline / npx unavailable) — the
 * caller then tells the user to run it themselves. We deliberately do NOT ship a `.figs/config.json`
 * in the skeleton (identity is minted here, per clone — never copied).
 */
function runInit(target) {
  try {
    execFileSync("npx", ["-y", "@figs-so/cli@latest", "init"], { cwd: target, stdio: "inherit" })
    return true
  } catch {
    return false
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
    // The committed tree only (honors the source's .gitignore — no .env, no .figs journal).
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
  const opts = { dir: null, from: null, yes: false, here: false, noInit: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--help" || a === "-h") opts.help = true
    else if (a === "--yes" || a === "-y") opts.yes = true
    else if (a === "--here") opts.here = true
    else if (a === "--no-init") opts.noInit = true
    else if (a === "--from") opts.from = argv[++i]
    else if (a.startsWith("--from=")) opts.from = a.slice("--from=".length)
    else if (!a.startsWith("-") && !opts.dir) opts.dir = a
    else throw new Error(`unknown argument: ${a}  (try --help)`)
  }
  return opts
}

function nextSteps(dir, name, inited) {
  const cd = dir === "." ? "" : `cd ${dir}\n  `
  console.log(`\n✔ Done — "${name}" scaffolded${inited ? " and figs-initialized (local identity + journal)." : "."}\n`)
  console.log(`  ${cd}# read AGENTS.md, then fill your charter in .figs/agent.json (role, mandate, department)`)
  if (inited === false)
    console.log(`  npx @figs-so/cli@latest init   # mint your local identity + journal (couldn't run it automatically)`)
  console.log(`  # work — figs records you locally from day one, no account needed`)
  console.log(`  # when your team should see it:  figs login → figs link → figs push`)
  console.log(`\n  ⚠ Add another employee with create-openfigs again — never copy this folder (it carries this agent's identity).\n`)
}

function usage() {
  console.log(`create-openfigs — scaffold one OpenFigs employee

Usage:
  npm create openfigs@latest [dir]
  npx create-openfigs [dir] [options]

One repo = one employee. For a team, run this once per job and point them at the same Figs
workspace. Never copy a scaffolded folder to make another — scaffold fresh so each mints its own identity.

Options:
  --from <source>  skeleton source: github:owner/repo[#ref] or a local path
                   (default: ${DEFAULT_SOURCE}; or set OPENFIGS_SOURCE)
  --here           scaffold into the current directory
  --no-init        skip running \`figs init\` (you'll run it yourself)
  -y, --yes        non-interactive (no prompts)
  -h, --help       show this help
`)
}

function rel(p) {
  const r = path.relative(process.cwd(), p)
  return r === "" ? "." : r
}
