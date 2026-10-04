/**
 * The shell's input box, driven by keystrokes: editing mid-line, the Ctrl-C
 * warning before leaving, reverse search, and history kept between sessions.
 */

import React from 'react';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FullScreenShell, searchHistory } from '../src/ui/FullScreenShell.js';
import { HISTORY_LIMIT, appendHistory, loadHistory } from '../src/shell-history.js';
import { detectCapabilities, glyphsFor } from '../src/ui/theme.js';

const capabilities = { ...detectCapabilities(), color: false, tty: true, unicode: true, width: 100 };
const glyphs = glyphsFor(capabilities);
const settle = () => new Promise((r) => setTimeout(r, 30));

const LEFT = '\u001b[D';
const CTRL_C = '\u0003';
const CTRL_R = '\u0012';

function shell(history: string[] = []) {
  const onSubmit = vi.fn();
  const onExit = vi.fn();
  const app = render(
    <FullScreenShell
      glyphs={glyphs}
      capabilities={capabilities}
      header="sirus"
      lines={[{ id: 0, text: 'hello', kind: 'output' }]}
      busy={false}
      history={history}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      onExit={onExit}
    />,
  );
  const type = async (keys: string) => {
    for (const key of keys.match(/\u001b\[[A-D]|./gsu) ?? []) {
      app.stdin.write(key);
      await settle();
    }
  };
  return { ...app, onSubmit, onExit, type };
}

describe('editing the input mid-line', () => {
  it('fixes a typo in the middle without retyping the rest', async () => {
    const s = shell();
    await settle();
    await s.type('/scn .');
    await s.type(LEFT + LEFT + LEFT);
    await s.type('a');
    await s.type('\r');
    expect(s.onSubmit).toHaveBeenCalledWith('/scan .');
    s.unmount();
  });
});

describe('leaving with Ctrl-C', () => {
  it('warns on the first press and leaves on the second', async () => {
    const s = shell();
    await settle();
    await s.type(CTRL_C);
    expect(s.lastFrame()).toContain('Press Ctrl+C again to exit.');
    expect(s.onExit).not.toHaveBeenCalled();
    await s.type(CTRL_C);
    expect(s.onExit).toHaveBeenCalled();
    s.unmount();
  });

  it('clears a half-typed line first, rather than leaving', async () => {
    const s = shell();
    await settle();
    await s.type('/scan');
    await s.type(CTRL_C);
    expect(s.onExit).not.toHaveBeenCalled();
    expect(s.lastFrame()).not.toContain('/scan');
    s.unmount();
  });
});

describe('Ctrl-R reverse search', () => {
  it('finds the newest matching command and runs it on Enter', async () => {
    const s = shell(['/scan . --json', '/guard eval feed', '/scan contract/fixtures/chaos-repo']);
    await settle();
    await s.type(CTRL_R);
    await s.type('scan');
    expect(s.lastFrame()).toContain('/scan contract/fixtures/chaos-repo');
    await s.type(CTRL_R);
    expect(s.lastFrame()).toContain('/scan . --json');
    await s.type('\r');
    expect(s.onSubmit).toHaveBeenCalledWith('/scan . --json');
    s.unmount();
  });

  it('lists matches newest first, without repeats', () => {
    expect(searchHistory(['/a', '/b scan', '/a', '/scan'], '')).toEqual(['/scan', '/a', '/b scan']);
    expect(searchHistory(['/a', '/b scan', '/scan'], 'scan')).toEqual(['/scan', '/b scan']);
  });
});

describe('history kept between sessions', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const file = () => {
    const d = mkdtempSync(join(tmpdir(), 'sirus-history-'));
    dirs.push(d);
    return join(d, 'nested', 'shell_history');
  };

  it('remembers what was typed, oldest first', () => {
    const path = file();
    appendHistory('/scan .', path);
    appendHistory('/guard eval feed', path);
    expect(loadHistory(path)).toEqual(['/scan .', '/guard eval feed']);
  });

  it('is readable by its owner only', () => {
    const path = file();
    appendHistory('/login --api-key x', path);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('keeps the newest entries when it grows past the limit', () => {
    const path = file();
    for (let i = 0; i < HISTORY_LIMIT * 2 + 5; i += 1) appendHistory(`/cmd ${i}`, path);
    const kept = loadHistory(path);
    expect(kept).toHaveLength(HISTORY_LIMIT);
    expect(kept.at(-1)).toBe(`/cmd ${HISTORY_LIMIT * 2 + 4}`);
  });

  it('treats a missing file as no history', () => {
    expect(loadHistory(join(tmpdir(), 'sirus-no-such-dir', 'shell_history'))).toEqual([]);
  });
});
