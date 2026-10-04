# Security policy

Sirus is a security tool, so a flaw in it can leave people believing they are protected when they are not. Reports
are welcome and taken seriously.

## Supported versions

| Version | Supported |
|---|---|
| 0.4.x (latest on npm as [`@srusan/sirus`](https://www.npmjs.com/package/@srusan/sirus)) | ✅ |
| Older, including the earlier `@srusan/sirius` package name | ❌ — please upgrade |

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through GitHub instead:
**[Security → Report a vulnerability](https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/security/advisories/new)**.

Please include:

- the version (`sirus --version`), your OS and `node -v`;
- the command you ran and what happened;
- a minimal file or feed that reproduces it, if you have one;
- what an attacker could achieve.

You will get an acknowledgement within **3 working days** and an assessment within **10**. Fixes are released as a
new patch version, with a GitHub security advisory and credit to you unless you prefer otherwise. Please give us a
reasonable chance to ship a fix before disclosing publicly.

## What counts

In scope, for example:

- a signed report, ledger entry or `guard` decision trail that can be altered, re-signed or forged and still verify;
- `guard` allowing an action that its own policy, identity or manipulation checks should have blocked;
- a crafted file, feed or config that makes Sirus execute code, write outside its working directory, or leak data;
- secrets or credentials exposed by Sirus itself (logs, reports, `--json` output, the history file).

Out of scope:

- **The planted fixtures.** `contract/fixtures/` (for example `chaos-repo` and `rule-gallery`) contain fake secrets and
  vulnerable code **on purpose**, so the rules have something to find. They are not real credentials.
- A rule missing a vulnerability in your code (a false negative) is a bug, not a security issue: please open a normal
  issue with an example.
- Simulated actions: `revenue recover` and `guard` never move real money and say so.

By default Sirus runs locally and sends nothing anywhere. It makes network requests only when you ask it to: with
`--validate-secrets`, which asks a provider (read-only) whether a leaked key is live, and when you configure an API
server with `sirus login` or `--api-url`.
