/**
 * `sirus demo`, and the shell's session commands.
 *
 * The demo is checked by running it: a tour whose scan beat finds nothing,
 * because the planted fixture never made it into the package, would print a
 * clean bill of health and look like it worked.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { BEATS } from '../src/commands/demo.js';
import { SHELL_COMMANDS } from '../src/ui/CommandPalette.js';
import { exportSession, lastOutput, sessionMarkdown, statusLines } from '../src/shell-session.js';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'dist', 'cli.js');
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const scratch = () => {
  const d = mkdtempSync(join(tmpdir(), 'sirus-demo-test-'));
  dirs.push(d);
  return d;
};

const run = (args: string[]) => {
  try {
    return execFileSync(process.execPath, [CLI, ...args], {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', SIRUS_SCAN_PACE: '0', SIRUS_REVENUE_PACE: '0' },
    });
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? '');
  }
};

describe('sirus demo', () => {
  it('runs only commands the CLI actually has', () => {
    const known = SHELL_COMMANDS.map((c) => c.name);
    for (const beat of BEATS) for (const step of beat.steps) expect(known).toContain(step.argv[0]);
  });

  it('scans the bundled planted fixture and finds what was planted', () => {
    expect(existsSync(join(here, '..', 'dist', 'demo', 'chaos-repo', 'src', 'config.py'))).toBe(true);
    const out = run(['demo', 'scan', '--fast', '--dir', scratch()]);
    expect(out).toContain('The code the agent runs on');
    expect(out).toContain('₹89,30,000');
    expect(out).toContain('60/100');
  }, 60_000);

  it('signs a report on its own, scanning first', () => {
    const out = run(['demo', 'report', '--fast', '--dir', scratch()]);
    expect(out).toMatch(/OK\s+report\.json/);
  }, 60_000);

  it('names the beats when asked for one that does not exist', () => {
    let stderr = '';
    try {
      execFileSync(process.execPath, [CLI, 'demo', 'nope'], { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      stderr = String((error as { stderr?: string }).stderr ?? '');
    }
    expect(stderr).toContain('guard, scan, revenue, reconcile, report');
  });
});

describe('the session commands', () => {
  const lines = [
    { text: 'banner', kind: 'output' },
    { text: '/scan .', kind: 'input' },
    { text: '\u001b[31mfirst finding\u001b[0m', kind: 'output' },
    { text: '/guard eval feed', kind: 'input' },
    { text: 'Decisions 64 allowed', kind: 'output' },
    { text: 'Autonomy 82.1%', kind: 'output' },
  ];

  it('/copy takes what the last command printed, without colour codes', () => {
    expect(lastOutput(lines)).toBe('Decisions 64 allowed\nAutonomy 82.1%');
    expect(lastOutput([{ text: 'banner', kind: 'output' }])).toBe('');
  });

  it('/export writes each command as a heading with its output beneath', () => {
    const md = sessionMarkdown(lines, new Date('2026-10-04T10:00:00Z'));
    expect(md).toContain('# sirus session — 2026-10-04 10:00 UTC');
    expect(md).toContain('## `/scan .`');
    expect(md).toContain('first finding');
    expect(md).not.toContain('\u001b[');

    const path = join(scratch(), 'session.md');
    expect(exportSession(lines, path)).toBe(path);
    expect(readFileSync(path, 'utf8')).toContain('## `/guard eval feed`');
  });

  it('/status says where you are and what was scanned last', () => {
    const out = statusLines({ version: '0.4.2', mode: 'full screen', lastScan: '/tmp/x', context: 'scanning ~ · local engine' });
    expect(out[0]).toContain('sirus v0.4.2 · full screen shell');
    expect(out.join('\n')).toContain(process.cwd());
    expect(out.join('\n')).toContain('last scan   /tmp/x');
  });
});
