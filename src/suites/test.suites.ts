import type { Frame, ReStage } from '../restage.js';
import { TestSuite1 } from './suite1/test.suite.js';
import { TestSuite2 } from './suite2/test.suite.js';

function log(message: string): void {
  console.log(`[Suites] ${message}`);
}

export class TestSuites {
  static readonly SUITE_1 = 'suite1' as const;
  static readonly SUITE_2 = 'suite2' as const;

  static readonly SUPPORTED = ['all', TestSuites.SUITE_1, TestSuites.SUITE_2] as const;

  readonly target: TestTarget;

  constructor(private readonly restage: ReStage) {
    this.target = restage.testTarget();
  }

  has(name: TestTarget): boolean {
    return this.target === 'all' || this.target === name;
  }

  async run(): Promise<void> {
    log(`Test target: ${this.target}`);

    const activityItem = this.restage.page.locator('[aria-label="ReSTage"]:visible');
    await activityItem.waitFor({ state: 'visible' });

    let frameTitle: string | undefined | null;
    const frame = (await this.restage.waitFor(
      async () => {
        await this.restage.click(activityItem); // Click Restage Icon
        return await this.restage.getFrame();
      },
      async (frame) => {
        frameTitle = await (await (frame as Frame).frameElement()).getAttribute('title');
        return frame !== undefined;
      },
    )) as Frame;

    log(`FrameTitle: ${frameTitle}`);

    if (frameTitle === 'Project Wizard' || this.has(TestSuites.SUITE_1)) {
      await this.restage.getFrame(frameTitle, '#projectFolder');
      const suite = new TestSuite1(this.restage);
      await suite.run();
      log('Suite 1 completed.');
    }

    if (this.has(TestSuites.SUITE_2)) {
      const suite = new TestSuite2(this.restage);
      await suite.run();
      log('Suite 2 completed.');
    }
  }
}

export type TestTarget = (typeof TestSuites.SUPPORTED)[number];
