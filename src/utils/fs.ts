import fs from 'node:fs/promises';

export async function ensureDir(path: string) {
  await fs.mkdir(path, { recursive: true });
}
