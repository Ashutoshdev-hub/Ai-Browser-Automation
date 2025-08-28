import "dotenv/config";

export const config = {
  browser: {
    headless: false,
    slowMo: 120,
    viewport: { width: 1280, height: 720 }
  },
  timeouts: {
    navigation: 30_000,
    assert: 12_000
  },
  paths: {
    screenshots: "./screenshots",
    videos: "./videos"
  },
  userAgent: "ai-browser-agent/0.3 (playwright)",
  retries: 2,
  recordVideo: true
};

export function setHeadless(v: boolean) {
  config.browser.headless = v;
}
export function setRetries(n: number) {
  config.retries = Math.max(0, Math.floor(n));
}
export function setVideo(on: boolean) {
  config.recordVideo = !!on;
}
