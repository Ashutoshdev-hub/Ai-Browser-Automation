import {
  chromium,
  type Page,
  type Browser,
  type BrowserContext,
} from "playwright";
import path from "node:path";
import { config } from "./config.js";
import { ensureDir } from "./utils/fs.js";

export async function launch() {
  await ensureDir(config.paths.screenshots);
  await ensureDir(config.paths.videos);

  const browser: Browser = await chromium.launch({
    headless: config.browser.headless,
    slowMo: config.browser.slowMo,
  });

  const context: BrowserContext = await browser.newContext({
    viewport: config.browser.viewport,
    userAgent: config.userAgent,
    recordVideo: config.recordVideo ? { dir: config.paths.videos } : undefined,
  });

  const page: Page = await context.newPage();
  page.setDefaultTimeout(config.timeouts.navigation);
  return { browser, context, page };
}

export async function gotoAndReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
}

export async function snap(page: Page, label: string) {
  const file = path.join(
    config.paths.screenshots,
    `${Date.now()}-${label}.png`
  );
  await page.screenshot({ path: file });
  return file;
}

export async function closeAndGetVideo(
  context: BrowserContext,
  page: Page,
  browser: Browser
) {
  const vid = page.video();
  await context.close().catch(() => {});
  const file = vid ? await vid.path().catch(() => null) : null;
  await browser.close().catch(() => {});
  return file;
}
