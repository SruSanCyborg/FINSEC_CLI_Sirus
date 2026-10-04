<p align="center">
  <img src="https://raw.githubusercontent.com/SruSanCyborg/FINSEC_CLI_Sirus/main/media/sirus-hero.svg" width="100%" alt="Sirus by SruSan">
</p>

<p align="center">
  <b>Decide, per action, whether an AI agent should be allowed to move money — and keep a signed record of every decision.</b>
</p>

<p align="center">
  <a href="https://github.com/SruSanCyborg/FINSEC_CLI_Sirus">GitHub</a> ·
  <a href="https://github.com/SruSanCyborg/FINSEC_CLI_Sirus#how-guard-decides">How it decides</a> ·
  <a href="https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/blob/main/media/sirus-demo.mp4">Demo video</a>
</p>

**Sirus** sits between an autonomous agent and the money. It judges each proposed action, lets routine work through
untouched, and stops the ones that should not happen — without a human approving every payment. It also scans the code
the agent runs on, maps each finding to a compliance clause, and prices the exposure in rupees.

- **Graduated verdicts** — `ALLOW`, `VERIFY`, `CONSTRAIN` or `BLOCK`
- **Six checks** — identity, intent, policy, context, behaviour and prompt injection
- **Tamper-evident** — every decision is hash-chained and ed25519-signed
- **Code scanning** — tree-sitter and taint analysis, mapped to PCI-DSS v4.0, RBI, DPDP and GDPR
- **Fully local** — no backend, no network, no account

## Install

Requires [Node.js](https://nodejs.org) 22 or newer. Works on macOS, Linux and Windows.

```bash
npx @srusan/sirus                # run without installing
npm install -g @srusan/sirus     # or install the `sirus` command
```

Also available through `pnpm add -g`, `yarn global add` and `bunx`.

## Quick start

```bash
sirus guard gen feed             # a day of agent payments, with attacks planted
sirus guard eval feed --narrate  # judge every action, explained
sirus scan .                     # scan your project
sirus doctor                     # check your setup
```

```
  Decisions   264 allowed (95%)   2 step-up   1 constrained   11 blocked
  Autonomy    95.0% of actions proceeded with nobody asked
```

Run `sirus` on its own for the interactive shell. Every command has `--help`; full documentation is on
[GitHub](https://github.com/SruSanCyborg/FINSEC_CLI_Sirus).

## License

MIT © [Sanjay Sivakumar](https://github.com/SruSanCyborg) (SruSan)
