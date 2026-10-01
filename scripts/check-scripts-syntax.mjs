import {spawnSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));

async function collect(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (entry.name.endsWith('.mjs')) files.push(path);
  }
  return files;
}

const files = (await collect(scriptsDir)).sort();
const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {stdio: 'inherit'});
  if (result.status !== 0) failures.push(file);
}

if (failures.length) {
  console.error(`\nSyntax check failed: ${failures.map((file) => resolve(file)).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Syntax-checked ${files.length} scripts.`);
}
