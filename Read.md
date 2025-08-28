# AI Browser Agent — Signup Form Auto-Filler

A CLI-driven agent that uses Playwright to open a browser, navigate to a signup page, detect form fields dynamically, fill them using human-like typing, and optionally submit the form. Built in TypeScript with modular utilities for retries, assertions, and media capture.

Quick summary
- Target (default): https://ui.chaicode.com/auth/signup
- Language: TypeScript (Node.js)
- Automation: Playwright
- Features: dynamic field detection, dry-fill vs submit, screenshots, video recording, retries, assertions

Table of contents
- Features
- Requirements
- Installation
- Playwright browsers
- Usage (interactive + flags)
- CLI flags (full)
- Examples
- Outputs (screenshots & video)
- Troubleshooting
- Development notes
- Project structure
- License

Features
- CLI interface with prompts or flags.
- Heuristic field detection (labels, placeholders, aria attributes, input types, nearby text, contentEditable).
- Dry-fill mode: fill fields but do not submit.
- Submit mode: click detected submit button.
- Simulated human typing with randomized delays.
- Capture screenshots and optional video recordings of runs.
- Retries for fragile steps and simple post-submit assertions.

Requirements
- Node.js LTS (recommended >= 16)
- npm
- Playwright (binaries installed via npm script)
- Internet access to reach the target URL

Installation
1. Clone the repo and install dependencies:
```bash
git clone https://github.com/your-username/ai-browser-agent.git
cd ai-browser-agent
npm install
```

2. Install Playwright browsers (required for video/screenshots and proper rendering):
```bash
npm run pw:install
```

Usage

Run interactive dev CLI:
```bash
npm run dev
```
This will prompt for Email (required) and optional fields (password, confirm, first, last). The agent will open the target URL, detect fields, simulate typing, optionally submit, and save screenshots/video.

Run with flags (non-interactive):
```bash
npm run dev -- \
  --email test@example.com \
  --password Passw0rd! \
  --confirm Passw0rd! \
  --first John \
  --last Doe \
  --submit \
  --retries 2
```

CLI flags (full)
- --url <url>  
  Target URL (default: https://ui.chaicode.com/auth/signup)
- --email <email>  
  Email address (required if not provided interactively)
- --password <password>  
  Password to fill
- --confirm <password>  
  Confirm password to fill
- --first <name>  
  First name
- --last <name>  
  Last name
- --submit  
  Click submit button after filling (default: false)
- --assert-text <txt>  
  Assert that given text appears after submit (case-insensitive)
- --assert-selector <css>  
  Assert that a CSS selector becomes visible after submit
- --retries <n>  
  Retry count for fragile steps (default: 2)
- --headless  
  Run browser in headless mode
- --no-video  
  Disable video recording

Examples

Basic dry-fill (interactive)
```bash
npm run dev
# follow prompts; do not add --submit
```

Fill + submit + assert welcome text
```bash
npm run dev -- \
  --email user@test.com \
  --password MyPass123! \
  --confirm MyPass123! \
  --first ashutosh \
  --last Kumar \
  --submit \
  --assert-text "Welcome"
```

Outputs
- Screenshots saved under ./screenshots/  
  Example: screenshots/169331231-after-fill.png
- Video recordings saved under ./videos/ (one directory per run)  
  Example: videos/d45ac04a71a756dd8e5842d0c720a792/video.webm

Where output paths come from
- Configured in src/config.ts as config.paths.screenshots and config.paths.videos.

Troubleshooting
- Playwright browsers not installed
  - Symptom: errors about missing browsers or binary files.
  - Fix: run `npm run pw:install` and ensure it completes. For CI, install browsers during pipeline or set PLAYWRIGHT_BROWSERS_PATH.

- Detection reports no fields found
  - Symptom: detection result shows false for all fields.
  - Fix: verify the target URL is correct and that the page structure is not heavily shadowed or custom. Provide flags for required values (--email, --password) to ensure essential inputs are present. Complex custom widgets may need manual mapping.

- Video not recorded or missing
  - Symptom: no files appear in ./videos/.
  - Fix: ensure --no-video is not set and process has permission to write to ./videos/. In some CI/headless environments, video capture may be disabled. Try running locally with headless=false for debugging.

- Screenshots not saved
  - Symptom: ./screenshots/ empty.
  - Fix: ensure directory exists and writable. Check logs for errors during screenshot capture.

- Submit fails or nothing changes after click
  - Symptom: click does not navigate or assertion never passes.
  - Fix: increase --retries, use --assert-selector or --assert-text for reliable validation, or inspect network/devtools to see if anti-bot detection blocks automation.

- TypeScript/ts-node/tsx issues
  - Symptom: compilation/runtime errors when running dev script.
  - Fix: ensure Node.js version is compatible, run `npm install` again, and consider building with `npm run build` then `npm run start`.

Best practices
- Run first without --submit to verify field detection and typing.
- Use --assert-selector where possible for deterministic validation.
- Capture outputs and attach them when troubleshooting with maintainers.

Development notes
- Strict TypeScript; modules under src/.
- Human-like typing is provided by src/utils/human.ts.
- Field detection heuristics live in src/auth.ts (label/placeholder/type/nearby text/scoring).
- Retries wrapper provided in src/utils/retry.ts.
- Assertions in src/assertions.ts.
- Browser orchestration in src/browser.ts.

Project structure (high-level)
- src/
  - cli.ts — CLI entry
  - browser.ts — Playwright launch / helpers / media
  - auth.ts — detection, dry-fill, submit logic
  - assertions.ts — helper assertions (text, selector)
  - config.ts — runtime configuration (timeouts, paths)
  - utils/
    - human.ts — human-like typing
    - fs.ts — filesystem helpers
    - retry.ts — retry helper
- screenshots/ — default output screenshots
- videos/ — default output videos

Recording a demo video (for submission)
1. Run with --submit and desired fields:
```bash
npm run dev -- \
  --email test@example.com \
  --password Passw0rd! \
  --confirm Passw0rd! \
  --first Test \
  --last User \
  --submit
```
2. Locate the video under ./videos/<run-id>/video.webm and upload it to cloud storage (Google Drive, Dropbox).
3. Ensure sharing permissions are set to "Anyone with link → Viewer" and provide both repo link and video link.

Contributing
- Open an issue or submit a pull request for feature requests or bug fixes.
- Add tests and documentation for new heuristics or major changes.

License
MIT © 2025 Ashutosh Kumar

If you want, I can also:
- Add a shorter README.md for the repo root plus a detailed DEVELOPERS.md for contributors.
- Provide a sample .env.example and CI snippet that installs Playwright browsers.

