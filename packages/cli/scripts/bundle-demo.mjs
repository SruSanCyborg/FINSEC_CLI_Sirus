// Copies the planted demo fixture into dist/ so `sirus demo` can run from an
// installed package. Copied at build time, not kept as a second checked-in copy:
// contract/fixtures/chaos-repo is the one source, and its totals do not move.
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(pkg, '..', '..', 'contract', 'fixtures', 'chaos-repo');
const to = join(pkg, 'dist', 'demo', 'chaos-repo');
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
