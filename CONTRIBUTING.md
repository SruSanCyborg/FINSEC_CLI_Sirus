# Contributing to Sirus

Thanks for helping. Bug reports, rule ideas and pull requests are all welcome.

## Before you start

- **Questions and ideas:** [Discussions](https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/discussions).
- **Bugs:** open an [issue](https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/issues/new/choose) using the bug template.
- **Security problems:** never in public. See [SECURITY.md](SECURITY.md).
- **Bigger changes:** open an issue or discussion first, so we can agree on the approach before you spend time on it.

[`AGENTS.md`](AGENTS.md) is the full orientation (architecture, conventions, history), and
[`docs/decisions.md`](docs/decisions.md) records why things are the way they are.

## Set up

Requires Node.js 22+ and pnpm (`corepack enable` gives you the pinned version).

```bash
git clone https://github.com/SruSanCyborg/FINSEC_CLI_Sirus && cd FINSEC_CLI_Sirus
pnpm install
pnpm build                                   # tsc → packages/cli/dist
pnpm test                                    # vitest
node packages/cli/dist/cli.js                # the shell, from your build
```

## Before you open a pull request

```bash
pnpm build && pnpm test                      # always
pnpm shell:check                             # if you touched the shell or a command's output
SIRUS_INLINE=1 pnpm shell:check              # the same, for the inline shell
pnpm rehearse                                # if you touched scan or fix
pnpm artifact:check                          # if a published figure could have moved
```

`shell:check` and `rehearse` drive the real shell in a real terminal. They have caught bugs a green test suite did not.

## How this project works

A few rules every change here follows:

1. **A test that has not been seen to fail has not been shown to test anything.** For a bug fix, revert the fix, watch
   the new test go red, then restore it.
2. **Never print a number nobody computed.** Figures in the README and docs come from live runs; `pnpm artifact`
   regenerates them.
3. **Layout gives way; content does not.** A column may narrow or wrap, but a value (especially money) is never
   shortened into something that still reads as valid.
4. **Every command works both ways**, as `sirus x` and as `/x` in the shell. `parity.test.ts` enforces it.
5. **Money is Indian-grouped**: `₹42,00,000`, never `₹4,200,000`.

## Adding a rule

Rule IDs are `SIR-SEC-NNN`, numbered in blocks of ten by category. Every rule ships with a planted example **and** a
correct counterpart in [`contract/fixtures/rule-gallery/`](contract/fixtures/rule-gallery), so it is proven both to fire
and to leave good code alone. Map it to real clauses (PCI-DSS **v4.0** numbers) and check it with
`sirus rules validate` and `sirus rules test`. Do not change `contract/fixtures/chaos-repo`; its totals are pinned.

## Pull requests

- One topic per PR, with a description of what changed and why.
- Update docs and `CHANGELOG.md` (under *Unreleased*) for anything a user would notice.
- CI must be green.

By contributing you agree that your work is released under the [MIT License](LICENSE), and to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
