import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// Test against a LOCAL openfigs checkout (no network, no published repo needed). Defaults to the
// sibling repo; CI sets OPENFIGS_TEST_SOURCE to its checkout. The live github: path is exercised
// post-launch once figs-so/openfigs is public.
const source = process.env.OPENFIGS_TEST_SOURCE || path.resolve(pkgRoot, "..", "openfigs")
const haveSource = fs.existsSync(source)

test("fetches a skeleton, scaffolds a first agent, wires live symlinks", { skip: !haveSource && `no openfigs source at ${source}` }, () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "openfigs-"))
  fs.rmSync(target, { recursive: true, force: true }) // index refuses a non-empty dir

  execFileSync("node", [path.join(pkgRoot, "index.mjs"), target, "--agent", "demo", "--yes", "--from", source], {
    stdio: "ignore",
  })

  try {
    // Root symlinks point at the canonical source.
    assert.equal(fs.readlinkSync(path.join(target, "CLAUDE.md")), "AGENTS.md")
    assert.equal(fs.readlinkSync(path.join(target, ".claude", "skills")), "../.agents/skills")
    assert.ok(fs.lstatSync(path.join(target, "CLAUDE.md")).isSymbolicLink(), "CLAUDE.md is a real symlink")

    // First agent scaffolded, with its own symlink + substituted name.
    const agent = path.join(target, "agents", "demo")
    assert.ok(fs.existsSync(path.join(agent, "AGENTS.md")), "agent AGENTS.md exists")
    assert.equal(fs.readlinkSync(path.join(agent, "CLAUDE.md")), "AGENTS.md")
    assert.ok(!fs.readFileSync(path.join(agent, "AGENTS.md"), "utf8").includes("<AGENT_NAME>"), "name substituted")
  } finally {
    fs.rmSync(target, { recursive: true, force: true })
  }
})
