import { ReStage } from '../restage.js';
import { TestSuite1 } from './suite1/test.suite.js';

type TestTarget = 'all' | 'suite1';

function testTarget(): TestTarget {
  const value = (process.env.RESTAGE_TEST_TARGET ?? 'all').trim().toLowerCase();
  const supported: TestTarget[] = ['all', 'suite1'];
  if (!supported.includes(value as TestTarget)) {
    throw new Error(`Unsupported RESTAGE_TEST_TARGET: ${value}`);
  }
  return value as TestTarget;
}

function log(message: string): void {
  console.log(`[ReSTage Suites] ${message}`);
}

export class TestSuites {
  constructor(private readonly restage: ReStage) {}

  async run(): Promise<void> {
    const target = testTarget();

    log(`Test target: ${target === 'all' ? 'all tests' : target}`);

    if (target === 'all' || target === 'suite1') {
      const suite = new TestSuite1(this.restage);
      await suite.run();
      log('Suite 1 completed.');
      return;
    }
  }
}
