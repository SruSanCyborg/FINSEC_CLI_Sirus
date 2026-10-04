# Changelog

All notable changes to Sirus. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project uses [Semantic Versioning](https://semver.org/). Each entry links to the decision records in
[`docs/decisions.md`](docs/decisions.md) for the reasoning.

## [Unreleased]

## [0.4.2] — 2026-10-04

### Changed
- **The full-screen shell is the default again**, with the problems that made 0.4.1 drop it fixed (D-060):
  - it no longer erases the terminal history you had before running `sirus`;
  - the SIRUS logo stays reachable by scrolling, however long the session;
  - the session is printed back to your terminal when you leave, with `/exit` or a double Ctrl-C.
- `SIRUS_INLINE=1` opens the plain scrollback shell instead (replaces 0.4.1's `SIRUS_FULLSCREEN`).

### Added
- **`sirus demo [beat]`**: the whole product live in one command (guard, scan, revenue, reconcile, signed report), in a
  scratch directory. Works from a plain npm install.
- Line editing in the shell: `←` `→`, `Ctrl-A` `Ctrl-E`, `Option/Alt-←` `→`, `Ctrl-U` `Ctrl-K` `Ctrl-W`.
- Command history saved between sessions, and `Ctrl-R` to search it.
- "Press Ctrl+C again to exit." before leaving.
- Shell commands `/status`, `/pwd`, `/copy` (the last output) and `/export` (the session as Markdown).

## [0.4.1] — 2026-10-04

### Changed
- **Renamed from Sirius to Sirus** (D-058). The package is now [`@srusan/sirus`](https://www.npmjs.com/package/@srusan/sirus)
  and the command is `sirus`. Config and state moved with it: `sirus.yaml`, `.sirusignore`, `.siruslintrc`, `.sirus/`,
  `~/.config/sirus`, `# sirus-ignore`, and `SIRUS_*` environment variables. The old names are not read.
  **Upgrading:** rename those files and variables in your project.
- The shell opened inline by default (D-059). Reverted in 0.4.2.
- Revenue seeds were renamed, so revenue figures differ from 0.4.0.

### Fixed
- Entering the shell no longer erased the terminal's scrollback.
- Keystrokes meant for `/triage` no longer went to the shell instead.
- Ctrl-C to stop `/watch` no longer closed the shell.
- Typing `y` and Enter quickly now applies a fix.
- The stress report fits a 60-column terminal.

## [0.4.0] — 2026-09-30

First release on npm, as `@srusan/sirius` (now unpublished; use `@srusan/sirus`): `guard`, `scan`, `fix`, `triage`,
`revenue`, `reconcile`, signed reports and the ledger, and the interactive shell.

[Unreleased]: https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/releases/tag/v0.4.2
[0.4.1]: https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/commit/49d237c
[0.4.0]: https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/commit/518797c
