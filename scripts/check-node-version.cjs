#!/usr/bin/env node
// Guards `npm run seed` specifically, not the app itself: `next dev`/
// `build`/`start` don't touch the Prisma CLI at all and run fine on a much
// wider range of Node versions. But `prisma db seed` loads `@prisma/dev`,
// which does a plain `require()` of an ESM-only dependency — that only
// works on Node versions with stable require(esm) support, and throws a
// raw ERR_REQUIRE_ESM stack trace otherwise (see AI-WORKLOG.md) instead of
// any indication the real problem is just an unswitched Node version.
// `engines` + engine-strict in .npmrc only checks at `npm install` time,
// not `npm run`, so a shell that's just missing `nvm use` for this session
// sails right past that and hits the cryptic error instead.
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
