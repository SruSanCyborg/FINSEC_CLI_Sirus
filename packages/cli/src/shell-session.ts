/**
 * The shell's session commands: /status, /pwd, /copy, /export.
 *
 * They describe or save *this* session, which is why they exist only inside the
 * shell. Kept apart from the renderers so the full-screen and inline shells give
 * the same answers, and so they can be tested without a terminal.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { findProjectRoot } from './config/load.js';
import { historyPath, loadHistory } from './shell-history.js';
import { stripAnsi } from './ui/kit.js';

/** A transcript line, as much of it as these commands need. */
export interface SessionLine {
  text: string;
  kind: string;
}

export interface StatusFacts {
  version: string;
  mode: 'full screen' | 'inline';
  lastScan: string | null;
  context: string;
}

export function statusLines(facts: StatusFacts): string[] {
  const cwd = process.cwd();
  const project = findProjectRoot(cwd);
  const saved = loadHistory().length;
  return [
    `sirus v${facts.version} · ${facts.mode} shell`,
    `directory   ${cwd}`,
    `project     ${project ? `${project.dir} (sirus.yaml)` : 'none — /init would create sirus.yaml here'}`,
    `engine      ${facts.context.split(' · ').at(-1) ?? 'local engine'}`,
    `last scan   ${facts.lastScan ?? 'none this session — /scan . to start'}`,
    `history     ${saved} saved command${saved === 1 ? '' : 's'} in ${historyPath()}`,
    facts.mode === 'full screen'
      ? 'mode        SIRUS_INLINE=1 opens the plain scrollback shell instead'
      : 'mode        unset SIRUS_INLINE for the full-screen shell',
  ];
}

/**
 * What the last command printed: the lines after the most recent input line.
 * Empty when nothing has run yet.
 */
export function lastOutput(lines: SessionLine[]): string {
  let start = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i]?.kind === 'input') {
      start = i;
      break;
    }
  }
  if (start < 0) return '';
  return lines
    .slice(start + 1)
    .map((line) => stripAnsi(line.text).trimEnd())
    .join('\n')
    .trim();
}

/** The session as Markdown: each command as a heading, its output in a block. */
export function sessionMarkdown(lines: SessionLine[], when = new Date()): string {
  const out = [`# sirus session — ${when.toISOString().replace('T', ' ').slice(0, 16)} UTC`, ''];
  let block: string[] = [];
  const flush = () => {
    const body = block.join('\n').trim();
    if (body) out.push('```', body, '```', '');
    block = [];
  };
  for (const line of lines) {
    const text = stripAnsi(line.text).trimEnd();
    if (line.kind === 'input') {
      flush();
      out.push(`## \`${text}\``, '');
    } else {
      block.push(text);
    }
  }
  flush();
  return out.join('\n');
}

/** Writes the session and returns where it went. */
export function exportSession(lines: SessionLine[], file?: string): string {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const path = resolve(process.cwd(), file ?? `sirus-session-${stamp}.md`);
  writeFileSync(path, sessionMarkdown(lines), 'utf8');
  return path;
}
