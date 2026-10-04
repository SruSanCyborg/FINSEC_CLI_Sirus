/**
 * The shell a person gets by typing `sirus` (D-059).
 *
 * Customers reported two things about the full-screen shell, both true: you
 * could not scroll the terminal back to the wordmark, and after leaving it
 * everything was gone — including the history from *before* `sirus` ran,
 * because entering sent ESC[3J, which erases the terminal's scrollback.
 *
 * So the inline shell is the default, full screen is opt-in, and taking over
 * the screen never deletes history this process did not write.
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
  delete process.env.SIRUS_FULLSCREEN;
  delete process.env.SIRUS_NO_ALT_SCREEN;
});

afterEach(() => {
  process.env = { ...savedEnv };
  Object.defineProperty(process.stdout, 'isTTY', { value: savedOut, configurable: true });
  Object.defineProperty(process.stdin, 'isTTY', { value: savedIn, configurable: true });
  vi.restoreAllMocks();
});

describe('which shell `sirus` opens', () => {
  it('is the inline shell on a perfectly capable terminal, unless asked otherwise', () => {
    asTerminal();
    expect(fullScreenRequested()).toBe(false);
  });

  it('takes over the screen when SIRUS_FULLSCREEN=1 asks it to', () => {
    asTerminal();
    process.env.SIRUS_FULLSCREEN = '1';
    expect(fullScreenRequested()).toBe(true);
  });

  it('still refuses full screen where the terminal cannot do it', () => {
    asTerminal();
    process.env.SIRUS_FULLSCREEN = '1';
    process.env.TERM = 'dumb';
    expect(fullScreenRequested()).toBe(false);
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
});
