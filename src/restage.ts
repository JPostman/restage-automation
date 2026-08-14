import type { TestTarget } from './suites/test.suites.js';
import type { Frame, FrameLocator, Locator, Page } from 'playwright-core';
export type { Frame, FrameLocator, Locator, Page } from 'playwright-core';

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

  async waitExists(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<boolean> {
    log(`wait exists ${show(locator)} timeout=${timeout}ms`);
    try {
      await this.waitFor(
        () => locator.count(),
        (count) => count > 0,
        timeout,
      );
    } catch (e) {}
    return await this.exists(locator);
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

  /**
   * Finds the current VS Code webview Frame by its outer iframe title.
   *
   * Do not locate these iframes from page.locator(...): VS Code may host a
   * webview below another frame, and there can briefly be more than one
   * iframe with the same title while the webview is being replaced.
   */
  async findFrame(title?: string | null, selector?: string): Promise<Frame | undefined> {
    for (const frame of this.page.frames()) {
      if (frame === this.page.mainFrame() || frame.isDetached()) {
        continue;
      }

      try {
        if (title) {
          const actualTitle = await this.frameTitle(frame);
          if (actualTitle !== title) continue;
        }

        if (selector && (await frame.locator(selector).count()) === 0) {
          continue;
        }

        return frame;
      } catch {
        // VS Code may replace the webview while we inspect it.
      }
    }

    return undefined;
  }

  /**
   * Returns a live FrameLocator for a VS Code webview.
   *
   * The important detail is that the FrameLocator is created from the
   * frame's actual iframe element in its real parent frame. Using
   * page.locator('iframe[title=...]') assumes the iframe is in the main
   * frame and can select a stale duplicate.
   */
  async waitFrameLocator(title: string, selector = 'body', timeout = DEFAULT_TIMEOUT_MS): Promise<FrameLocator> {
    log(`wait frame ${JSON.stringify(title)} selector=${JSON.stringify(selector)} timeout=${timeout}ms`);

    const located = await this.waitFor<FrameLocator | undefined>(
      async () => {
        const frame = await this.findFrame(title, selector);
        if (!frame) return undefined;

        try {
          // frame.frameElement() returns an ElementHandle, and
          // ElementHandle.contentFrame() returns Promise<Frame | null>.
          // For a live FrameLocator we must locate the iframe from its actual
          // parent frame and call Locator.contentFrame().
          const parent = frame.parentFrame();
          if (!parent) return undefined;

          const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const iframes = parent.locator(`iframe[title="${escapedTitle}"]:visible`);

          for (let index = 0, count = await iframes.count(); index < count; index += 1) {
            const liveFrame = iframes.nth(index).contentFrame();
            const ready = liveFrame.locator(selector).first();

            if (await ready.isVisible()) {
              return liveFrame;
            }
          }
        } catch {
          // The candidate was replaced between discovery and conversion.
          // Retry against the current frame tree.
        }

        return undefined;
      },
      (frame) => frame !== undefined,
      timeout,
    );

    if (!located) {
      throw new Error(`Frame not found: ${title}`);
    }

    return located;
  }

  async frameTitle(frame: Frame): Promise<string | undefined> {
    try {
      const iframe = await frame.frameElement();
      const title = await iframe.getAttribute('title');
      if (title) return title;
    } catch {
      // VS Code may replace a webview frame while we are inspecting it.
    }

    try {
      const title = await frame.title();
      return title || undefined;
    } catch {
      return undefined;
    }
  }

  async getFrame(title?: string | null, selector?: string, timeout = DEFAULT_TIMEOUT_MS): Promise<Frame | undefined> {
    return this.waitFor(
      () => this.findFrame(title, selector),
      (frame) => frame !== undefined,
      timeout,
    );
  }

  async waitFrame(title: string, timeout = DEFAULT_TIMEOUT_MS): Promise<Frame> {
    const frame = await this.getFrame(title, undefined, timeout);
    if (!frame) throw new Error(`Frame not found: ${title}`);
    return frame;
  }
}
