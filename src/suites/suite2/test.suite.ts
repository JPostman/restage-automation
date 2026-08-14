import { ReStage } from '../../restage.js';
import { Resources } from '../../resources.js';
import { Asserts } from './asserts.js';
import { ActionsTest } from './tests/actions.test.js';

export class TestSuite2 {
  constructor(private readonly restage: ReStage) {}

  async run(): Promise<void> {
    const resources = new Resources(this.restage);
    const asserts = new Asserts(this.restage, resources);
    const actionsTest = new ActionsTest(this.restage);

    await actionsTest.init();
  }
}
