import type { ReStage } from '../restage.js';
import { TestSuite1 } from './suite1/test.suite.js';

function log(message: string): void {
  console.log(`[ReSTage Suites] ${message}`);
}

export class TestSuites {
  static readonly SUITE_1 = 'suite1' as const;

  readonly target: TestTarget;

  constructor(private readonly restage: ReStage) {
    this.target = restage.testTarget();
  }

  has(name: TestTarget): boolean {
    return this.target === 'all' || this.target === name;
  }

  async run(): Promise<void> {
    log(`Test target: ${this.target}`);

    if (this.has(TestSuites.SUITE_1)) {
      const suite = new TestSuite1(this.restage);
      await suite.run();
      log('Suite 1 completed.');
      return;
    }
  }
}

export type TestTarget = 'all' | typeof TestSuites.SUITE_1;
