/**
 * `sirus demo` — the whole product, in order, in one command.
 *
 * Customers met Sirus as a list of separate commands and asked for the tour in
 * one place: what the README and the demo video show, run live on their own
 * machine. Every beat is the real command against generated data and a bundled
 * planted fixture, in a scratch directory, so nothing is written where they are
 * and every number on screen is one this run computed.
 *
 * `sirus demo <beat>` runs one beat on its own.
 */

import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CliError } from '../api/errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = join(here, '..', 'cli.js');
/** The planted fixture, copied into the package by the build. */
const FIXTURE = join(here, '..', 'demo', 'chaos-repo');

export const VIDEO_URL = 'https://github.com/SruSanCyborg/FINSEC_CLI_Sirus/blob/main/media/sirus-demo.mp4';

interface Step {
  argv: string[];
  /** Relative to the demo directory. */
  cwd?: string;
}

export interface Beat {
  name: string;
  title: string;
  says: string;
  steps: Step[];
}

export const BEATS: Beat[] = [
  {
    name: 'guard',
    title: 'Agents that can move money',
    says: 'A day of two agents’ payments with attacks planted in it. Every action is judged; most go through untouched.',
    steps: [
      { argv: ['guard', 'gen', 'feed', '--seed', 'demo'] },
      { argv: ['guard', 'eval', 'feed', '--narrate'] },
      { argv: ['guard', 'score', 'feed'] },
    ],
  },
  {
    name: 'scan',
    title: 'The code the agent runs on',
    says: 'A small payments service with six planted problems: each one mapped to a compliance clause and priced in rupees.',
    steps: [{ argv: ['scan', '.'], cwd: 'chaos-repo' }],
  },
  {
    name: 'revenue',
    title: 'Money at risk in operations',
    says: 'Failed payments and ageing invoices, ranked by what acting would actually recover — and what must not be touched.',
    steps: [
      { argv: ['revenue', 'gen', 'batch', '--seed', 'demo'] },
      { argv: ['revenue', 'detect', 'batch', '--limit', '12'] },
    ],
  },
  {
    name: 'reconcile',
    title: 'Three sets of books that disagree',
    says: 'Captures, settlements and bank lines matched five ways; what cannot be matched is named, with the next step.',
    steps: [
      { argv: ['reconcile', 'books', '--gen', '--seed', 'demo'] },
      { argv: ['reconcile', 'books'] },
    ],
  },
  {
    name: 'report',
    title: 'Proof nobody changed it afterwards',
    says: 'The scan, signed with ed25519 and entered into an append-only ledger — then verified.',
    steps: [
      { argv: ['report', '--output', 'report.json'], cwd: 'chaos-repo' },
      { argv: ['report', '--verify', 'report.json'], cwd: 'chaos-repo' },
    ],
  },
];

export interface DemoOptions {
  dir?: string;
  fast?: boolean;
}

function run(step: Step, dir: string, fast: boolean): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_ENTRY, ...step.argv], {
      cwd: step.cwd ? join(dir, step.cwd) : dir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(fast ? { SIRUS_SCAN_PACE: '0', SIRUS_REVENUE_PACE: '0', SIRUS_REPLAY_SPEED: '0' } : {}),
      },
    });
    child.on('error', () => resolve(2));
    // A scan that finds what was planted exits 1; that is the demo working.
    child.on('close', (code) => resolve(code ?? 0));
  });
}

export async function runDemo(beat: string | undefined, options: DemoOptions): Promise<void> {
  const chosen = beat ? BEATS.filter((b) => b.name === beat) : BEATS;
  if (beat && chosen.length === 0) {
    throw new CliError(`unknown demo beat: ${beat}`, {
      hint: `Choose one of: ${BEATS.map((b) => b.name).join(', ')} — or run \`sirus demo\` for all of them.`,
    });
  }

  const dir = options.dir ?? mkdtempSync(join(tmpdir(), 'sirus-demo-'));
  if (existsSync(FIXTURE) && !existsSync(join(dir, 'chaos-repo'))) {
    cpSync(FIXTURE, join(dir, 'chaos-repo'), { recursive: true });
  }
  // `report` signs the last scan, so on its own it needs one first.
  const needsScan = chosen.some((b) => b.name === 'report') && !chosen.some((b) => b.name === 'scan');

  const out = (text: string) => process.stdout.write(text);
  out(`\n  sirus demo · ${chosen.length === BEATS.length ? 'the whole tour' : chosen[0]?.title}\n`);
  out(`  running in ${dir}\n`);

  if (needsScan) await run({ argv: ['scan', '.', '--json'], cwd: 'chaos-repo' }, dir, true);

  for (const [index, b] of chosen.entries()) {
    out(`\n  ── ${index + 1}/${chosen.length}  ${b.title}\n`);
    out(`     ${b.says}\n\n`);
    for (const step of b.steps) {
      out(`  $ sirus ${step.argv.join(' ')}\n`);
      await run(step, dir, Boolean(options.fast));
    }
  }

  out('\n  That is the tour. Everything it made is in\n');
  out(`    ${dir}\n`);
  out('\n  Next:  sirus scan .          your own code\n');
  out('         sirus demo <beat>     one part again: ' + BEATS.map((b) => b.name).join(', ') + '\n');
  out(`         narrated video        ${VIDEO_URL}\n\n`);
}
