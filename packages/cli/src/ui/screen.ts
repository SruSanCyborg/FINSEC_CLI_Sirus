import { writeSync } from 'node:fs';

/**
 * Alternate screen buffer management.
 *
 * The full-screen shell takes over the terminal's drawing surface the way `vim`
 * and `htop` do, which is how an agent CLI's fullscreen renderer works: the
 * transcript lives in the alternate buffer and the input stays pinned at the
 * bottom instead of drifting as output streams in.
 *
 * The dangerous part is not entering — it is leaving. A process that dies while
 * the alternate buffer is active, or with the cursor hidden, leaves the user
 * with a terminal that looks broken and needs `reset`. Every exit path is
 * covered here, once, so no caller has to remember.
 */

const ENTER_ALT = '\u001b[?1049h';
const LEAVE_ALT = '\u001b[?1049l';
const HIDE_CURSOR = '\u001b[?25l';
const SHOW_CURSOR = '\u001b[?25h';
// The visible screen only. This used to send 3J as well, which erases the
// terminal's scrollback — everything the user had done before running `sirus`
// was gone when they came back to it. A program has no business deleting
// history it did not write (D-059).
const CLEAR = '\u001b[2J\u001b[H';

// Mouse reporting: 1000 sends button events (the wheel is buttons 64/65),
// 1006 asks for the SGR encoding, which is the only one that survives past
// column 95. Enabling this takes click-drag selection away from the terminal,
// which is why it is opt-out-able and why the footer says how to select.
// 1002 is button-event tracking: press, release, *and* motion while a button
// is held. 1000 reports press and release only, which is enough for the wheel
// but not for a drag — and without drag there is no in-app selection.
const ENABLE_MOUSE = '\u001b[?1002h\u001b[?1006h';
const DISABLE_MOUSE = '\u001b[?1006l\u001b[?1002l';

// Alternate scroll: while the alternate screen is active, the terminal turns
// wheel events into arrow keys itself. That is the whole trick — the wheel
// scrolls without us capturing the mouse, so click, drag and copy keep working
// exactly as they normally do. Full mouse capture buys click handling on top,
// and costs text selection, which is why it stays opt-in.
const ENABLE_ALT_SCROLL = '\u001b[?1007h';
const DISABLE_ALT_SCROLL = '\u001b[?1007l';

let active = false;
let mouseEnabled = false;
let altScrollEnabled = false;
let teardownRegistered = false;

/**
 * Whether the alternate screen should be used at all.
 *
 * Honors an explicit opt-out, because it genuinely breaks in some places —
 * notably `tmux -CC` integration mode — and because a user who wants their
 * native scrollback back should not have to argue with us for it.
 */
/** Whether to capture mouse events. Off entirely when the alt screen is off. */
export function mouseReportingAvailable(): boolean {
  // On by default, which is what other full-screen TUIs do and the only way the wheel
  // actually scrolls: alternate scroll (1007) is not implemented everywhere,
  // and where it is missing the wheel does nothing at all.
  //
  // The cost is that the terminal's own click-drag selection stops working
  // while we hold the mouse. Hold the terminal's override key to select
  // natively (Fn on Terminal.app, Option in iTerm2, Shift elsewhere), or set
  // SIRUS_NO_MOUSE=1 to give the mouse back entirely.
  if (process.env.SIRUS_NO_MOUSE === '1') return false;
  return alternateScreenAvailable();
}

/** The terminal's modifier for a one-off native selection while we hold the mouse. */
export function nativeSelectionKey(): string {
  const program = process.env.TERM_PROGRAM ?? '';
  if (program === 'Apple_Terminal') return 'fn';
  if (/iTerm/i.test(program)) return 'option';
  return 'shift';
}

/**
 * Whether the shell should take over the screen. Off unless asked for.
 *
 * The full-screen shell lives in the alternate buffer: the terminal's own
 * scrollback stops working, and everything in the session disappears when it
 * exits. People expected a terminal tool to behave like one — scroll back to
 * the wordmark with the trackpad, and still see what they did after leaving —
 * so the inline shell is the default and full screen is the opt-in (D-059).
 */
export function fullScreenRequested(): boolean {
  return process.env.SIRUS_FULLSCREEN === '1' && alternateScreenAvailable();
}

export function alternateScreenAvailable(): boolean {
  const env = process.env;
  if (env.SIRUS_NO_ALT_SCREEN === '1') return false;
  if (env.TERM === 'dumb' || !env.TERM) return false;
  return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}

/** Restores the terminal. Safe to call repeatedly and from a signal handler. */
/** True while a child process owns the real terminal. See the suspend helper. */
let suspended = false;

export function leaveAlternateScreen(): void {
  if (!active) return;
  active = false;
  // Mouse first. A terminal left in reporting mode is worse than a terminal
  // left on the alternate screen: every click prints escape gibberish and the
  // user cannot select text until they reset.
  // writeSync, not stdout.write: this runs from signal handlers and from
  // 'exit', where process.exit() truncates a queued asynchronous write. A
  // terminal left in mouse-reporting mode prints escape gibberish on every
  // click and cannot select text, which is worse than never having had the
  // feature.
  const restore =
    (mouseEnabled ? DISABLE_MOUSE : '') +
    (altScrollEnabled ? DISABLE_ALT_SCROLL : '') +
    SHOW_CURSOR +
    LEAVE_ALT;
  mouseEnabled = false;
  altScrollEnabled = false;
  try {
    writeSync(1, restore);
  } catch {
    // stdout already closed; nothing left to restore it on.
  }
}

export function enterAlternateScreen(): void {
  if (active) return;
  active = true;
  process.stdout.write(ENTER_ALT);
  process.stdout.write(CLEAR);
  process.stdout.write(ENABLE_ALT_SCROLL);
  altScrollEnabled = true;
  if (mouseReportingAvailable()) {
    mouseEnabled = true;
    process.stdout.write(ENABLE_MOUSE);
  }

  if (teardownRegistered) return;
  teardownRegistered = true;

  // Every way this process can end, including the ones nobody plans for.
  process.on('exit', leaveAlternateScreen);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      // A child owns the terminal: the signal was aimed at it, not at us.
      if (suspended) return;
      leaveAlternateScreen();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    });
  }
  process.on('uncaughtException', (error) => {
    leaveAlternateScreen();
    process.stderr.write(`\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
    process.exit(1);
  });
}

/**
 * Runs `fn` with the alternate screen suspended, so a child process can own the
 * real terminal — used when a command needs the genuine TTY rather than having
 * its output captured.
 *
 * While suspended, this process stops treating Ctrl-C as its own. The signal
 * reaches every process in the foreground group, so without the guard below the
 * shell would exit on the keystroke the user pressed to quit the child — losing
 * the session to a keypress aimed at something else.
 */
export async function withAlternateScreenSuspended<T>(fn: () => Promise<T>): Promise<T> {
  const wasActive = active;
  suspended = true;
  if (wasActive) leaveAlternateScreen();
  try {
    return await fn();
  } finally {
    suspended = false;
    if (wasActive) {
      active = false; // force a genuine re-enter rather than a no-op
      enterAlternateScreen();
    }
  }
}

export function isAlternateScreenActive(): boolean {
  return active;
}

export { HIDE_CURSOR, SHOW_CURSOR };
