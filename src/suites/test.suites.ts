import type { ReStage } from '../restage.js';
import { TestSuite1 } from './suite1/test.suite.js';
import { TestSuite2 } from './suite2/test.suite.js';
import { Wizard } from './tests/wizard.js';

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

    const activityItem = this.restage.page.locator('[aria-label="ReSTage"].uri-icon:visible').first();
    await this.restage.waitVisible(activityItem);
    await this.restage.click(activityItem); // Click ReStage icon once.

    const actions = this.restage.page.getByRole('button', { name: 'Actions Section' });
    const projectExists = await this.restage.waitExists(actions, 2_000);

    if (!projectExists) {
      await this.restage.waitFrame('Project Wizard');
      if (this.has(TestSuites.SUITE_1)) {
        const suite = new TestSuite1(this.restage);
        await suite.run();
        log('Suite 1 completed.');
      } else {
        const wizard = new Wizard(this.restage);
        await wizard.setProject(this.restage.rootDir);
        await wizard.openProject();
      }
    }

    if (this.has(TestSuites.SUITE_2)) {
      const suite = new TestSuite2(this.restage);
      await suite.run();
      log('Suite 2 completed.');
    }
  }
}

export type TestTarget = (typeof TestSuites.SUPPORTED)[number];
