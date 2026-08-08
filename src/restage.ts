import type { Frame, Locator, Page } from 'playwright-core';
import { frameByTitle as findFrameByTitle } from './support/frames.js';

export type { Frame, Locator, Page } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 120_000;

function show(locator: Locator): string {
  return locator.toString();
}

export class ReStage {
  constructor(public readonly page: Page) {}

  async click(locator: Locator, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    console.log(`[UI] click ${show(locator)} - ${button}`);
    await locator.click({ button: button });
  }

  async fill(locator: Locator, value: string, valueOut: boolean = true): Promise<void> {
    console.log(`[UI] fill ${show(locator)}` + (valueOut ? ` = ${JSON.stringify(value)}` : ''));
    await locator.fill(value);
  }

  async drag(source: Locator, target: Locator): Promise<void> {
    console.log(`[UI] drag ${show(source)} -> ${show(target)}`);
    await source.dragTo(target);
  }

  async select(locator: Locator, value: string): Promise<void> {
    console.log(`[UI] select ${show(locator)} = ${JSON.stringify(value)}`);
    await locator.selectOption(value);
  }

  async waitVisible(locator: Locator, timeout = DEFAULT_TIMEOUT_MS): Promise<void> {
    console.log(`[UI] wait ${show(locator)} timeout=${timeout}ms`);
    await locator.waitFor({ state: 'visible', timeout });
  }

  async frameByTitle(title: string, timeout = DEFAULT_TIMEOUT_MS): Promise<Frame> {
    return await findFrameByTitle(this.page, title, timeout);
  }
}
