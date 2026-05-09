# AGENTS.md

## Repo Overview

This repository contains standalone YouTube userscripts. There is no package manager, bundler, or test runner in the repo. Changes are made directly in the `*.user.js` files.

## Files That Matter

- `yt-sort-by-views.user.js`: channel `/videos` page enhancement with DOM sorting and pagination suppression once sorting starts.
- `yt-stop-pagination.user.js`: channel `/videos` page pagination blocker.
- `yt-watch.user.js`: watch page fullscreen control fix.

## Editing Guidelines

- Keep scripts dependency-free and compatible with direct userscript execution.
- Preserve the userscript metadata block at the top of each file.
- Prefer small DOM-targeted changes over broad rewrites because YouTube markup is brittle.
- Reuse the existing patterns in the repo: `MutationObserver`, `yt-navigate-finish`, and small helper functions.
- Avoid introducing build tooling, module systems, or external libraries unless the user explicitly asks for that.
- When behavior changes materially, update the `@description` and bump the `@version` date.

## Validation

- Read the selectors and page guards carefully before changing behavior.
- Manual validation is the primary check:
  - Channel `/videos` pages for `yt-sort-by-views.user.js` and `yt-stop-pagination.user.js`
  - `/watch` pages for `yt-watch.user.js`
- If browser automation artifacts or screenshots are generated during work, keep them under `output/` or `assets/` as appropriate.

## Documentation

- Keep `README.md` aligned with the actual script names and behavior.
- Document YouTube-specific limitations plainly rather than implying broad browser support.
