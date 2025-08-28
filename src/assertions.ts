import type { Page } from "playwright";
import { config } from "./config.js";

export async function assertText(page: Page, text: string) {
  await page.getByText(new RegExp(text, "i")).first().waitFor({
    state: "visible",
    timeout: config.timeouts.assert
  });
  return true;
}

export async function assertSelector(page: Page, selector: string) {
  await page.locator(selector).first().waitFor({
    state: "visible",
    timeout: config.timeouts.assert
  });
  return true;
}
