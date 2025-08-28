#!/usr/bin/env node
import { Command } from "commander";
import prompts from "prompts";
import ora from "ora";
import chalk from "chalk";
import { launch, gotoAndReady, snap, closeAndGetVideo } from "./browser.js";
import { setHeadless, setRetries, setVideo, config } from "./config.js";
import { dryFillAuth, submitAuth } from "./auth.js";
import { withRetries } from "./utils/retry.js";
import { assertSelector, assertText } from "./assertions.js";

const program = new Command();

program
  .name("ai-auth-cli")
  .description("CLI: targets signup page with required email")
  .option(
    "-u, --url <url>",
    "URL to open",
    "https://ui.chaicode.com/auth/signup" 
  )
  .option("--password <password>", "password")
  .option("--confirm <password>", "confirm password")
  .option("--first <name>", "first name")
  .option("--last <name>", "last name")
  .option("--submit", "click the submit button after filling", false)
  .option("--assert-text <text>", "assert visible text after submit")
  .option("--assert-selector <css>", "assert selector visible after submit")
  .option(
    "--retries <n>",
    "retry count for fragile steps",
    (v) => parseInt(v, 10),
    2
  )
  .option("--headless", "run browser headless", false)
  .option("--no-video", "disable video recording")
  .parse(process.argv);

const opts = program.opts();

async function main() {
  setHeadless(!!opts.headless);
  setRetries(opts.retries);
  setVideo(!!opts.video);

  const answers = await prompts(
    [
      { type: "text", name: "email", message: "Email" }, 
      { type: opts.password ? null : "password", name: "password", message: "Password", initial: "" },
      { type: opts.confirm ? null : "password", name: "confirm", message: "Confirm password", initial: "" },
      { type: opts.first ? null : "text", name: "first", message: "First name", initial: "" },
      { type: opts.last ? null : "text", name: "last", message: "Last name", initial: "" }
    ].filter(Boolean) as any,
    { onCancel: () => process.exit(1) }
  );

  const url = (opts.url ?? "https://ui.chaicode.com/auth/signup") as string;
  const creds = {
    email: answers.email,
    password: (opts.password ?? answers.password) || undefined,
    confirmPassword: (opts.confirm ?? answers.confirm) || undefined,
    firstName: (opts.first ?? answers.first) || undefined,
    lastName: (opts.last ?? answers.last) || undefined
  };

  const spinner = ora(`Opening ${url} ...`).start();
  const { browser, context, page } = await launch();
  try {
    await withRetries("goto", () => gotoAndReady(page, url), config.retries);

    spinner.text = "Detecting & filling fields...";
    const result = await withRetries("dryFill", () => dryFillAuth(page, creds), config.retries);
    const shot1 = await snap(page, "after-fill");

    let shot2: string | null = null;
    if (opts.submit) {
      spinner.text = "Submitting...";
      await withRetries("submit", () => submitAuth(page), config.retries);
      await page.waitForLoadState("networkidle").catch(() => {});
      shot2 = await snap(page, "after-submit");

      if (opts.assertText) {
        spinner.text = `Asserting text: ${opts.assertText}`;
        await withRetries("assertText", () => assertText(page, opts.assertText!), config.retries);
      }
      if (opts.assertSelector) {
        spinner.text = `Asserting selector: ${opts.assertSelector}`;
        await withRetries("assertSelector", () => assertSelector(page, opts.assertSelector!), config.retries);
      }
    }

    spinner.succeed("Run complete.");
    const videoPath = await closeAndGetVideo(context, page, browser);

    console.log(chalk.green("Screenshots:"));
    console.log("  ", shot1, shot2 ? `\n   ${shot2}` : "");
    console.log(chalk.green("Video:"), videoPath ?? "(video off)");
    console.log(chalk.cyan("Detection result:"), result);
  } catch (e: any) {
    spinner.fail("Run failed");
    console.error(chalk.red(e?.message ?? e));
    const videoPath = await closeAndGetVideo(context, page, browser);
    if (videoPath) console.log(chalk.yellow("Partial video saved at:"), videoPath);
    process.exit(1);
  }
}

main();
