#!/usr/bin/env node
// Guards the npm scripts that break in confusing ways on the wrong Node
// version (see AI-WORKLOG.md) — e.g. `prisma db seed` throwing a raw
// ERR_REQUIRE_ESM stack trace on Node 20.14, instead of a clear message
// pointing at the fix. `engines` + engine-strict in .npmrc only checks at
// `npm install` time, not `npm run`, so a shell that's just missing
// `nvm use` for this session sails right past that and hits the cryptic
// error instead.
const REQUIRED = "^20.19.0, ^22.12.0, or >=24.0.0 (see .nvmrc, pinned to 22.21.1)";

const [major, minor] = process.versions.node.split(".").map(Number);
const ok =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 12) ||
  major >= 24;

if (!ok) {
  console.error(
    `\nThis project needs Node ${REQUIRED} — currently running Node ${process.versions.node}.\n` +
      `Run "nvm use" (or otherwise switch Node versions) in this terminal, then try again.\n`,
  );
  process.exit(1);
}
