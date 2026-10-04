/**
 * The input line's readline bindings. Before these, the prompt could only
 * append and delete at the end: a typo mid-line meant retyping everything after
 * it.
 */

import { describe, expect, it } from 'vitest';

import { editLine, line } from '../src/ui/line-editor.js';

const at = (value: string, cursor: number) => line(value, cursor);

describe('moving the cursor', () => {
  it('moves one character with the arrows, and stops at the ends', () => {
    expect(editLine(at('scan', 4), '', { leftArrow: true })).toEqual(at('scan', 3));
    expect(editLine(at('scan', 0), '', { leftArrow: true })).toEqual(at('scan', 0));
    expect(editLine(at('scan', 4), '', { rightArrow: true })).toEqual(at('scan', 4));
  });

  it('jumps to the start and end with Ctrl-A and Ctrl-E', () => {
    expect(editLine(at('/scan .', 3), 'a', { ctrl: true })).toEqual(at('/scan .', 0));
    expect(editLine(at('/scan .', 3), 'e', { ctrl: true })).toEqual(at('/scan .', 7));
  });

  it('moves a word at a time with Option/Alt and Ctrl+arrows', () => {
    const v = '/scan contract/fixtures --json';
    expect(editLine(at(v, v.length), '', { leftArrow: true, meta: true })?.cursor).toBe(24);
    expect(editLine(at(v, 24), 'b', { meta: true })?.cursor).toBe(6);
    expect(editLine(at(v, 0), 'f', { meta: true })?.cursor).toBe(5);
    expect(editLine(at(v, 5), '', { rightArrow: true, ctrl: true })?.cursor).toBe(23);
  });
});

describe('editing mid-line', () => {
  it('inserts at the cursor, not at the end', () => {
    expect(editLine(at('/scn .', 3), 'a', {})).toEqual(at('/scan .', 4));
  });

  it('deletes left of the cursor with Backspace, as the key is labelled', () => {
    expect(editLine(at('/scaan .', 4), '', { backspace: true })).toEqual(at('/scan .', 3));
    expect(editLine(at('/scaan .', 4), '', { delete: true })).toEqual(at('/scan .', 3));
    expect(editLine(at('/scan', 0), '', { delete: true })).toEqual(at('/scan', 0));
  });

  it('kills to the start with Ctrl-U and to the end with Ctrl-K', () => {
    expect(editLine(at('/scan wrong/path', 6), 'u', { ctrl: true })).toEqual(at('wrong/path', 0));
    expect(editLine(at('/scan wrong/path', 6), 'k', { ctrl: true })).toEqual(at('/scan ', 6));
  });

  it('deletes the previous word with Ctrl-W and Option+Backspace', () => {
    expect(editLine(at('/scan . --json', 14), 'w', { ctrl: true })).toEqual(at('/scan . ', 8));
    expect(editLine(at('/scan . --json', 14), '', { meta: true, delete: true })).toEqual(at('/scan . ', 8));
  });

  it('inserts a paste whole, without its newline', () => {
    expect(editLine(at('/scan ', 6), 'contract/fixtures\r', {})).toEqual(at('/scan contract/fixtures', 23));
  });
});

describe('keys that are not editing', () => {
  it('returns null so the shell can handle them', () => {
    expect(editLine(at('x', 1), 'c', { ctrl: true })).toBeNull();
    expect(editLine(at('x', 1), '\r', {})).toBeNull();
  });
});
