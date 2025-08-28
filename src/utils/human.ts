import type { Locator } from 'playwright';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function typeHuman(el: Locator, text: string) {
  
  try {
    await el.waitFor({ state: 'visible', timeout: 1500 });
  } catch {
    return false;
  }

  await el.scrollIntoViewIfNeeded();
  await el.focus();
  for (const ch of text) {
    await el.type(ch, { delay: 40 + Math.floor(Math.random() * 60) });
  }
  return true;
}
