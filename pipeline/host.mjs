// Who the host is (the person on camera, whose channel this suite works for): suite.json { "host": "<channel id>" },
// written during onboarding (docs/START-HERE.md, phase 1). Tools that take --channel default to it.
//   import { hostId, hostChannel } from '../host.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function hostId() {
  try { const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'suite.json'), 'utf8')); if (s.host) return String(s.host); } catch {}
  console.error('No host set. Create suite.json with { "host": "<your channel id>" } and channels/<id>.json (docs/START-HERE.md, phase 1), or pass --channel <id>.');
  process.exit(2);
}

export function hostChannel(id = hostId()) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'channels', `${id}.json`), 'utf8'));
}
