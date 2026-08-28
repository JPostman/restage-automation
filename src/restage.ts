import type { TestTarget } from './suites/suites.js';
import type { Frame, FrameLocator, Locator, Page } from 'playwright-core';
export type { Frame, FrameLocator, Locator, Page } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 20_000;
const ACTION_TIMEOUT_MS = 10_000;

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
    const stack = new Error().stack?.split('\n') ?? [];
    const caller = stack
      .slice(2)
      .map((line) => line.trim())
      .find((line) => !line.includes('ReStage.inspect') && !line.includes('node_modules'));

    log(`pause Playwright Inspector${caller ? ` <- ${caller.replace(/^at /, '')}` : ''}`);

    await this.openInspector();
    if (breakpoint) {
      debugger;
    }

    log('resume Playwright Inspector');
  }

  async sleep(ms: number = 500): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async exists(locator: Locator): Promise<boolean> {
    log(`exists ${show(locator)}`);
    return (await locator.count()) > 0;
  }

  async visible(locator: Locator, button: 'left' | 'right' | 'middle' = 'left'): Promise<boolean> {
    log(`visible ${show(locator)}`);
    return await locator.isVisible();
  }

  async click(locator: Locator, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    log(`click ${show(locator)} - ${button} timeout=${ACTION_TIMEOUT_MS}ms`);
    await locator.click({ button, timeout: ACTION_TIMEOUT_MS });
  }

  async check(locator: Locator): Promise<void> {
    log(`check ${show(locator)} timeout=${ACTION_TIMEOUT_MS}ms`);
    await locator.check({ timeout: ACTION_TIMEOUT_MS });
  }

  async uncheck(locator: Locator): Promise<void> {
    log(`uncheck ${show(locator)} timeout=${ACTION_TIMEOUT_MS}ms`);
    await locator.uncheck({ timeout: ACTION_TIMEOUT_MS });
  }

  async fill(locator: Locator, value: string, valueOut: boolean = true): Promise<void> {
    log(`fill ${show(locator)}` + (valueOut ? ` = ${JSON.stringify(value)}` : ''));
    await locator.fill(value, { timeout: ACTION_TIMEOUT_MS });
  }

  async drag(source: Locator, target: Locator): Promise<void> {
    log(`drag ${show(source)} -> ${show(target)}`);
    await source.dragTo(target);
  }

  async select(locator: Locator, value: string): Promise<void> {
    log(`select ${show(locator)} = ${JSON.stringify(value)}`);
    await locator.selectOption(value, { timeout: ACTION_TIMEOUT_MS });
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
    const startedAt = Date.now();
    const deadline = startedAt + timeout;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        const result = await this.withTimeout(value(), Math.max(1, deadline - Date.now()), `waitFor operation exceeded ${timeout}ms`);

        const matches = await this.withTimeout(Promise.resolve(condition(result)), Math.max(1, deadline - Date.now()), `waitFor condition exceeded ${timeout}ms`);

        if (matches) {
          return result;
        }
      } catch (error) {
        lastError = error;
      }

      const delay = Math.min(interval, deadline - Date.now());
      if (delay > 0) {
        await this.page.waitForTimeout(delay);
      }
    }

    const elapsed = Date.now() - startedAt;
    const details = lastError instanceof Error ? ` Last error: ${lastError.message}` : '';
    throw new Error(`waitFor timeout after ${elapsed}ms (configured ${timeout}ms).${details}`);
  }

  private async withTimeout<T>(operation: Promise<T>, timeout: number, message: string): Promise<T> {
    if (timeout <= 0) {
      throw new Error(message);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), timeout);
        }),
      ]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Finds the current VS Code webview Frame by its outer iframe title.
   *
   * Do not locate these iframes from page.locator(...): VS Code may host a
   * webview below another frame, and there can briefly be more than one
   * iframe with the same title while the webview is being replaced.
   */
  async findFrame(title?: string | null, selector?: string): Promise<Frame | undefined> {
    for (const page of this.page.context().pages()) {
      if (page.isClosed()) continue;
      for (const frame of page.frames()) {
        if (frame === page.mainFrame() || frame.isDetached()) continue;

        try {
          const iframe = await frame.frameElement();
          try {
            if (title && (await iframe.getAttribute('title')) !== title) {
              continue;
            }
            if (!(await iframe.isVisible())) continue;
          } finally {
            await iframe.dispose();
          }
          if (selector && !(await frame.locator(selector).first().isVisible())) {
            continue;
          }
          return frame;
        } catch {
          // The page or frame may be replaced during discovery.
        }
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
    const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    log(`wait frame iframe[title="${escapedTitle}"] selector=${JSON.stringify(selector)} timeout=${timeout}ms`);

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

  async toogleApiSchema(): Promise<void> {
    const openApiSchema = this.page.getByRole('button', {
      name: 'ReSTage action: Open API Schema',
    });
    await this.waitFor(
      async () => {
        const frame = await this.findFrame('ReSTage API Schema');
        if (frame && (await frame.isVisible('#apiSettingsOpen'))) {
          return true;
        }
        if (await this.exists(openApiSchema)) {
          await this.click(openApiSchema);
        }
        return false;
      },
      (exists) => exists,
    );
  }

  async defaultTestMenu(): Promise<void> {
    const defaultTest = this.page.getByText('Defaultmvn clean test');
    await this.sleep();
    if (await this.exists(defaultTest)) {
      await this.click(defaultTest);
    }
  }
}
