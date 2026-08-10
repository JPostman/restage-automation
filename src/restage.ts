import type { TestTarget } from './suites/test.suites.js';
import type { Frame, Locator, Page } from 'playwright-core';
export type { Frame, Locator, Page } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 120_000;

function show(locator: Locator): string {
  return locator.toString();
}

function log(message: string): void {
  console.log(`[ReSTage] ${message}`);
}

export class ReStage {
  constructor(
    public readonly rootDir: string,
    public readonly page: Page,
    public readonly testTarget: () => TestTarget,
    private readonly openInspector: () => Promise<void>,
  ) {}

  /**
   * Opens Playwright Inspector and waits until Inspector is resumed/closed.
   */
  async inspect(breakpoint = false): Promise<void> {
    log('pause Playwright Inspector');

    await this.openInspector();
    if (breakpoint) {
      debugger;
    }

    log('resume Playwright Inspector');
  }

  async click(locator: Locator, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    log(`click ${show(locator)} - ${button}`);
    await locator.click({ button });
  }

  async check(locator: Locator): Promise<void> {
    log(`check ${show(locator)}`);
    await locator.check();
  }

  async fill(locator: Locator, value: string, valueOut: boolean = true): Promise<void> {
    log(`fill ${show(locator)}` + (valueOut ? ` = ${JSON.stringify(value)}` : ''));
    await locator.fill(value);
  }

  async drag(source: Locator, target: Locator): Promise<void> {
    log(`drag ${show(source)} -> ${show(target)}`);
    await source.dragTo(target);
  }

  async select(locator: Locator, value: string): Promise<void> {
    log(`select ${show(locator)} = ${JSON.stringify(value)}`);
    await locator.selectOption(value);
  }

  async scroll(locator: Locator): Promise<void> {
    log(`scroll ${show(locator)}`);
    await locator.scrollIntoViewIfNeeded();
  }

  async waitVisible(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<void> {
    log(`wait ${show(locator)} timeout=${timeout}ms`);
    await locator.waitFor({ state: 'visible', timeout });
  }

  async frameByTitle(title: string, timeout = DEFAULT_TIMEOUT_MS): Promise<Frame> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      for (const frame of this.page.frames()) {
        if (frame === this.page.mainFrame() || frame.isDetached()) continue;
        try {
          const iframe = await frame.frameElement();
          if ((await iframe.getAttribute('title')) === title) {
            return frame;
          }
        } catch {
          // VS Code can replace webview frames while a view is opening.
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Frame not found: ${title}`);
  }
}
