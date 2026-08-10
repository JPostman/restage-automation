import type { TestTarget } from './suites/test.suites.js';
import type { Frame, FrameLocator, Locator, Page } from 'playwright-core';
export type { Frame, Locator, Page } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 20_000;

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

  async exists(locator: Locator): Promise<boolean> {
    log(`exists ${show(locator)}`);
    return (await locator.count()) > 0;
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

  async waitExists(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<void> {
    log(`wait exists ${show(locator)} timeout=${timeout}ms`);
    await this.waitFor(
      () => locator.count(),
      (count) => count > 0,
      timeout,
    );
  }

  async waitFor<T>(value: () => Promise<T>, condition: (value: T) => boolean | Promise<boolean>, timeout = DEFAULT_TIMEOUT_MS, interval = 250): Promise<T> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const result = await value();
      if (await condition(result)) {
        return result;
      }
      await this.page.waitForTimeout(interval);
    }
    throw new Error(`waitFor timeout after ${timeout}ms`);
  }

  async getFrame(title?: string | undefined | null, selector?: string, timeout = DEFAULT_TIMEOUT_MS): Promise<Frame | undefined> {
    return await this.waitFor(
      async () => {
        for (const frame of this.page.frames()) {
          if (frame === this.page.mainFrame() || frame.isDetached()) {
            continue;
          }
          try {
            const iframe = await frame.frameElement();
            const frameTitle = await iframe.getAttribute('title');
            if (iframe && frameTitle) {
              if (!title || title === frameTitle) {
                if (!selector || (await frame.locator(selector).count())) {
                  return frame;
                }
              }
            }
          } catch {
            // Frame may have been replaced.
          }
        }
        return undefined;
      },
      (frame) => frame !== undefined,
      timeout,
    );
  }

  async waitFrame(title: string, timeout = DEFAULT_TIMEOUT_MS): Promise<Frame> {
    return this.waitFor(
      async () => {
        return await this.getFrame(title, undefined, timeout);
      },
      (frame) => frame !== undefined,
      timeout,
    ) as Promise<Frame>;
  }
}
