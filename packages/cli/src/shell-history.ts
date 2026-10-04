/**
 * What was typed into the shell, kept between sessions.
 *
 * Closing the shell used to forget every command in it, so the long `/scan`
 * with three flags had to be retyped the next morning. Saved per user beside
 * the credentials, owner-readable only, capped so it never grows without bound.
 * ↑ and Ctrl-R reach it the next time the shell opens.
 */

import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const HISTORY_LIMIT = 500;

export function historyPath(): string {
  const base =
    process.env.SIRUS_CONFIG_HOME ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'sirus');
  return join(base, 'shell_history');
}

/** The saved history, oldest first. Unreadable or missing means empty. */
export function loadHistory(path = historyPath()): string[] {
  try {
    if (!existsSync(path)) return [];
    const lines = readFileSync(path, 'utf8').split('\n').filter((line) => line.trim() !== '');
    return lines.slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Appends one entry. Never throws: history is a convenience, and a read-only
 * home directory must not stop a command from running.
 */
export function appendHistory(entry: string, path = historyPath()): void {
  const line = entry.replace(/[\r\n]+/g, ' ').trim();
  if (!line) return;
  try {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    appendFileSync(path, `${line}\n`, { mode: 0o600 });
    chmodSync(path, 0o600);
    // Trim occasionally rather than on every write.
    const all = readFileSync(path, 'utf8').split('\n').filter(Boolean);
    if (all.length > HISTORY_LIMIT * 2) writeFileSync(path, `${all.slice(-HISTORY_LIMIT).join('\n')}\n`, { mode: 0o600 });
  } catch {
    // Not fatal.
  }
}
