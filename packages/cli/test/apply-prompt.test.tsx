/**
 * The fix confirmation. A terminal can hand over the answer and the Enter after
 * it as a single chunk — `y\r` — and compared whole that is not `y`: the prompt
 * sat there while the person who had said yes waited for a fix that never came.
 * The rehearsal caught it, typing as fast as a script does.
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';

import { ApplyPrompt } from '../src/ui/FixView.js';
import { detectCapabilities, glyphsFor } from '../src/ui/theme.js';

const capabilities = { ...detectCapabilities(), color: false, tty: true, unicode: true, width: 100 };
const glyphs = glyphsFor(capabilities);
const settle = () => new Promise((r) => setTimeout(r, 20));

async function answer(keys: string) {
  const onChoice = vi.fn();
  const app = render(<ApplyPrompt glyphs={glyphs} capabilities={capabilities} onChoice={onChoice} />);
  await settle();
  app.stdin.write(keys);
  await settle();
  app.unmount();
  return onChoice;
}

describe('ApplyPrompt', () => {
  it('accepts on y', async () => {
    expect(await answer('y')).toHaveBeenCalledWith('accept');
  });

  it('accepts when the y and its Enter arrive as one chunk', async () => {
    expect(await answer('y\r')).toHaveBeenCalledWith('accept');
  });

  it('skips on n followed by Enter in the same chunk', async () => {
    expect(await answer('n\r')).toHaveBeenCalledWith('skip');
  });
});
