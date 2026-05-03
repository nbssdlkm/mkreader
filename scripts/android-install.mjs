#!/usr/bin/env node
// Thin shim — delegates to the user-level android-remote-build skill.
// See ~/.claude/skills/android-remote-build/SKILL.md for full docs.

import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const skillLib = pathToFileURL(
  join(homedir(), ".claude/skills/android-remote-build/lib/install.mjs"),
);

const { runInstall } = await import(skillLib);
await runInstall(process.cwd(), process.argv.slice(2));
