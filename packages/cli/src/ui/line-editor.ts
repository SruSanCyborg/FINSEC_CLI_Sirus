/**
 * The shell's input line, as a value and a cursor.
 *
 * The prompt only ever appended and deleted at the end, so a typo in the middle
 * of `/scan contract/fixtures/chaos-repo --severity-threshold hgh` meant
 * deleting back to it and typing the rest again. These are the readline
 * bindings a terminal user's fingers already know — the same set bash, zsh and
 * the agent CLIs use — and nothing else.
 *
 * Pure, so every binding is tested without a terminal.
 */

export interface LineState {
  value: string;
  cursor: number;
}

/** The subset of Ink's key object the editor reads. */
export interface EditKey {
  leftArrow?: boolean;
  rightArrow?: boolean;
  home?: boolean;
  end?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  backspace?: boolean;
  delete?: boolean;
}

export const line = (value: string, cursor = value.length): LineState => ({
  value,
  cursor: Math.max(0, Math.min(cursor, value.length)),
});

/** Start of the word before the cursor, skipping any spaces first. */
export function wordLeft(value: string, cursor: number): number {
  let i = cursor;
  while (i > 0 && value[i - 1] === ' ') i -= 1;
  while (i > 0 && value[i - 1] !== ' ') i -= 1;
  return i;
}

/** End of the word after the cursor, skipping any spaces first. */
export function wordRight(value: string, cursor: number): number {
  let i = cursor;
  while (i < value.length && value[i] === ' ') i += 1;
  while (i < value.length && value[i] !== ' ') i += 1;
  return i;
}

/**
 * Applies one keypress to the line, or returns null when the key is not an
 * editing key — so the caller's own bindings (submit, history, scroll) still
 * get it.
 */
export function editLine(state: LineState, input: string, key: EditKey): LineState | null {
  const { value, cursor } = state;

  // Movement.
  if (key.leftArrow) return line(value, key.meta || key.ctrl ? wordLeft(value, cursor) : cursor - 1);
  if (key.rightArrow) return line(value, key.meta || key.ctrl ? wordRight(value, cursor) : cursor + 1);
  if (key.home || (key.ctrl && input === 'a')) return line(value, 0);
  if (key.end || (key.ctrl && input === 'e')) return line(value, value.length);
  // Option+←/→ on macOS arrives as ESC b / ESC f, which Ink reports as meta.
  if (key.meta && input === 'b') return line(value, wordLeft(value, cursor));
  if (key.meta && input === 'f') return line(value, wordRight(value, cursor));

  // Deletion.
  if (key.ctrl && input === 'u') return line(value.slice(cursor), 0);
  if (key.ctrl && input === 'k') return line(value.slice(0, cursor), cursor);
  if ((key.ctrl && input === 'w') || (key.meta && (key.backspace || key.delete))) {
    const from = wordLeft(value, cursor);
    return line(value.slice(0, from) + value.slice(cursor), from);
  }
  // Backspace on a Mac arrives as DEL, which Ink reports as `delete` — so both
  // delete to the left, the way the key is labelled.
  if (key.backspace || key.delete) {
    if (cursor === 0) return state;
    return line(value.slice(0, cursor - 1) + value.slice(cursor), cursor - 1);
  }

  // Typing, or a paste: inserted at the cursor. Newlines are the caller's.
  if (input && !key.ctrl && !key.meta) {
    const printable = input.replace(/[\r\n]/g, '');
    if (!printable) return null;
    return line(value.slice(0, cursor) + printable + value.slice(cursor), cursor + printable.length);
  }

  return null;
}
