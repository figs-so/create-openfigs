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
// post-launch. `--no-init` keeps the test offline (figs init would fetch the CLI via npx).
const source = process.env.OPENFIGS_TEST_SOURCE || path.resolve(pkgRoot, "..", "openfigs")
const haveSource = fs.existsSync(source)

test("fetches the skeleton, wires the symlink, stamps the agent name", { skip: !haveSource && `no openfigs source at ${source}` }, () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "openfigs-"))
  fs.rmSync(target, { recursive: true, force: true }) // index refuses a non-empty dir
  const name = path.basename(target)

  execFileSync("node", [path.join(pkgRoot, "index.mjs"), target, "--yes", "--no-init", "--from", source], {
    stdio: "ignore",
  })

  try {
    // The repo IS the employee — root symlink points at the canonical source.
    assert.equal(fs.readlinkSync(path.join(target, "CLAUDE.md")), "AGENTS.md")
    assert.equal(fs.readlinkSync(path.join(target, ".claude", "skills")), "../.agents/skills")
    assert.ok(fs.lstatSync(path.join(target, "CLAUDE.md")).isSymbolicLink(), "CLAUDE.md is a real symlink")

    // Guide + charter at the root, name substituted, no placeholders left.
    const guide = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8")
    assert.ok(guide.length > 0, "AGENTS.md exists at root")
    assert.ok(!guide.includes("<AGENT_NAME>"), "name substituted in AGENTS.md")
    const charter = JSON.parse(fs.readFileSync(path.join(target, ".figs", "agent.json"), "utf8"))
    assert.equal(charter.name, name, "charter name stamped")

    // No identity is shipped — figs init mints it per clone (we skipped init with --no-init).
    assert.ok(!fs.existsSync(path.join(target, ".figs", "config.json")), "no committed identity in the skeleton")
  } finally {
    fs.rmSync(target, { recursive: true, force: true })
  }
})
