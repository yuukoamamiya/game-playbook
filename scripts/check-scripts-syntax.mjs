import {spawnSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const skippedDirs = new Set(['archive']);

async function collect(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirs.has(entry.name)) continue;
      files.push(...await collect(path));
    } else if (entry.name.endsWith('.mjs')) {
      files.push(path);
    }
  }
  return files;
}

const files = (await collect(scriptsDir)).sort();
const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {stdio: 'inherit', timeout: 30000});
  if (result.status !== 0 || result.error) {
    failures.push({file, reason: result.error?.code === 'ETIMEDOUT' ? 'timed out' : 'syntax error'});
  }
}

if (failures.length) {
  console.error(`\nSyntax check failed: ${failures.map(({file, reason}) => `${relative(scriptsDir, resolve(file))} (${reason})`).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Syntax-checked ${files.length} scripts (archive/ skipped).`);
}
