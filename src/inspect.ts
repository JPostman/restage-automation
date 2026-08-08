import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from 'playwright-core';

const PROJECT_ROOT = process.cwd();
const RUNTIME_STATE = path.join(PROJECT_ROOT, '.restage-automation.json');
const TIMEOUT_MS = 30_000;

type RuntimeState = {
  playwrightEndpoint?: string;
};

function log(message: string): void {
  console.log(`[ReSTage Inspector] ${message}`);
}

function readRuntimeState(): RuntimeState {
  if (!fs.existsSync(RUNTIME_STATE)) {
    throw new Error('No running ReSTage automation session was found. Start the automation first and leave its VS Code window running.');
  }

  const state = JSON.parse(fs.readFileSync(RUNTIME_STATE, 'utf8')) as RuntimeState;
  if (!state.playwrightEndpoint) {
    throw new Error('The running automation did not publish a Playwright endpoint. Restart the automation with the current main.ts build.');
  }

  return state;
}

async function waitUntil<T>(work: () => Promise<T | null>, message: string, timeout = TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const value = await work();
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(message);
}

async function workbenchPage(browser: Browser): Promise<Page> {
  return waitUntil(async () => {
    const pages = browser.contexts().flatMap((context) => context.pages());

    for (const page of pages) {
      if (page.isClosed()) continue;
      const count = await page
        .locator('.monaco-workbench')
        .count()
        .catch(() => 0);
      if (count > 0) return page;
    }

    return null;
  }, 'Connected to the Playwright session, but the VS Code workbench page was not found.');
}

async function main(): Promise<void> {
  // PWDEBUG must exist before Playwright is imported in this helper process.
  delete process.env.DEBUG;
  process.env.PWDEBUG = '1';

  const state = readRuntimeState();
  const { chromium } = await import('playwright-core');

  log(`Attaching through Playwright browser binding: ${state.playwrightEndpoint}`);
  const browser = await chromium.connect(state.playwrightEndpoint!, { timeout: TIMEOUT_MS });

  try {
    const page = await workbenchPage(browser);

    log('Inspector ready. Use Pick Locator/Record as needed, then press Resume.');

    // page.pause() is the supported Playwright API for opening Inspector/codegen
    // controls. With PWDEBUG set before import, this avoids private recorder APIs.
    await page.pause();

    log('Inspector resumed. Disconnecting Inspector client.');
  } finally {
    // For a Browser obtained with BrowserType.connect(), close() disconnects this
    // client from the browser server; it does not close the VS Code application.
    await browser.close().catch(() => undefined);
  }
}

await main().catch((error: unknown) => {
  console.error(`[ReSTage Inspector] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
