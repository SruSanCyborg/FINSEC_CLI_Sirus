/**
 * The shell a person gets by typing `sirus` (D-059, D-060).
 *
 * Customers reported two things about the full-screen shell, both true: you
 * could not scroll back to the wordmark, and after leaving it everything was
 * gone — including the history from *before* `sirus` ran, because entering sent
 * ESC[3J, which erases the terminal's scrollback.
 *
 * The full-screen shell stays the default — it is the one people chose — and
 * the two costs are fixed where they happen: taking over the screen never
 * deletes history this process did not write, and the wordmark is never trimmed
 * out of the session.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Restoring the terminal writes synchronously to fd 1. Under a test runner fd 1
// is the runner's own output — the JSON reporter `pnpm artifact` parses — so the
// escape codes would land in the middle of it. Stub the write; only what
// entering sent is under test.
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()),
  writeSync: vi.fn(),
}));

import { enterAlternateScreen, fullScreenRequested, leaveAlternateScreen } from '../src/ui/screen.js';
import { capTranscript } from '../src/ui/FullScreenShell.js';
import type { TranscriptLine } from '../src/ui/FullScreenShell.js';

const ERASE_SCROLLBACK = '\u001b[3J';
const ENTER_ALT = '\u001b[?1049h';

const savedEnv = { ...process.env };
const savedOut = process.stdout.isTTY;
const savedIn = process.stdin.isTTY;

function asTerminal(): void {
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  process.env.TERM = 'xterm-256color';
}

beforeEach(() => {
  delete process.env.SIRUS_INLINE;
  delete process.env.SIRUS_NO_ALT_SCREEN;
});

afterEach(() => {
  process.env = { ...savedEnv };
  Object.defineProperty(process.stdout, 'isTTY', { value: savedOut, configurable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: savedIn, configurable: true });
  vi.restoreAllMocks();
});

describe('which shell `sirus` opens', () => {
  it('is the full-screen shell on a capable terminal', () => {
    asTerminal();
    expect(fullScreenRequested()).toBe(true);
  });

  it('is the inline shell when SIRUS_INLINE=1 asks for it', () => {
    asTerminal();
    process.env.SIRUS_INLINE = '1';
    expect(fullScreenRequested()).toBe(false);
  });

  it('is the inline shell where the terminal cannot take over the screen', () => {
    asTerminal();
    process.env.TERM = 'dumb';
    expect(fullScreenRequested()).toBe(false);
  });
});

describe('the wordmark survives a long session', () => {
  const line = (id: number, pinned = false): TranscriptLine => ({ id, text: `l${id}`, kind: 'output', pinned });

  it('keeps the pinned head when the cap trims the oldest lines', () => {
    const banner = [line(0, true), line(1, true), line(2, true)];
    const output = Array.from({ length: 50 }, (_, i) => line(100 + i));
    const capped = capTranscript([...banner, ...output], 20);

    expect(capped).toHaveLength(20);
    expect(capped.slice(0, 3).map((l) => l.id)).toEqual([0, 1, 2]);
    expect(capped.at(-1)?.id).toBe(149);
  });

  it('leaves a transcript under the cap untouched', () => {
    const lines = [line(0, true), line(1)];
    expect(capTranscript(lines, 20)).toBe(lines);
  });
});

describe('taking over the screen', () => {
  it('never erases the scrollback the user already had', () => {
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    enterAlternateScreen();
    leaveAlternateScreen();

    const output = written.join('');
    expect(output).toContain(ENTER_ALT);
    expect(output).not.toContain(ERASE_SCROLLBACK);
  });

  it("strips the scrollback erase from Ink's clear while the screen is ours", () => {
    const written: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    enterAlternateScreen();
    // What Ink writes before a frame as tall as the window: ansi-escapes'
    // clearTerminal, then the frame.
    process.stdout.write('\u001b[2J\u001b[3J\u001bHframe');
    process.stdout.write(Buffer.from('\u001b[3Jbytes'));
    leaveAlternateScreen();

    const output = written.join('');
    expect(output).toContain('frame');
    expect(output).toContain('bytes');
    expect(output).not.toContain(ERASE_SCROLLBACK);
  });
});
