import fs from "node:fs"
import path from "node:path"

const SKIP = new Set([".git", "node_modules"])

/**
 * Walk `dir` and enforce the two runtime symlink invariants an OpenFigs repo relies on:
 *   CLAUDE.md       -> AGENTS.md          (next to any AGENTS.md file)
 *   .claude/skills  -> ../.agents/skills  (next to any .agents/skills/ directory)
 *
 * A single-employee repo has one of each at the root; the walk stays general (and cheap) so it
 * also repairs a fork that nests. This is the robustness payoff of the scaffolder: however the
 * fetched skeleton's symlinks survive transit (preserved, or flattened into text files), we
 * regenerate them deterministically here. Returns the list of links created or repaired.
 */
export function enforceSymlinks(dir, found = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  if (entries.some((e) => e.name === "AGENTS.md" && e.isFile()))
    reconcile(path.join(dir, "CLAUDE.md"), "AGENTS.md", found)

  const agentsSkills = path.join(dir, ".agents", "skills")
  if (fs.existsSync(agentsSkills) && fs.statSync(agentsSkills).isDirectory()) {
    fs.mkdirSync(path.join(dir, ".claude"), { recursive: true })
    reconcile(path.join(dir, ".claude", "skills"), "../.agents/skills", found)
  }

  for (const e of entries)
    if (e.isDirectory() && !e.isSymbolicLink() && !SKIP.has(e.name))
      enforceSymlinks(path.join(dir, e.name), found)

  return found
}

function reconcile(linkPath, target, found) {
  let current = null
  try {
    current = fs.readlinkSync(linkPath)
  } catch {
    /* missing, or a regular file/dir where a symlink should be */
  }
  if (current === target) return
  fs.rmSync(linkPath, { force: true, recursive: true })
  fs.symlinkSync(target, linkPath)
  found.push(linkPath)
}
