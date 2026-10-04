## What and why

<!-- What does this change, and what problem does it solve? Link the issue: Fixes #123 -->

## How it was checked

- [ ] `pnpm build && pnpm test` pass
- [ ] For a bug fix: the new test fails without the fix and passes with it
- [ ] If the shell or a command's output changed: `pnpm shell:check` (and `SIRUS_INLINE=1 pnpm shell:check`)
- [ ] If a published figure could have moved: `pnpm artifact:check`
- [ ] Docs and `CHANGELOG.md` (*Unreleased*) updated for anything a user would notice
