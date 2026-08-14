import { test, prepareTestContext, reportTestFailure } from '../suites.js';
import { Resources } from '../../resources.js';
import { ActionsTest } from './tests/actions.test.js';

test.describe('Suite 2', () => {
  let _resources: Resources;
  let _actionsTest: ActionsTest;

  test.beforeAll(async ({ restage }) => {
    await prepareTestContext(restage, 'suite2');
    _resources = new Resources(restage);
    _actionsTest = new ActionsTest(restage);
  });

  test.afterEach(async ({ restage }, testInfo) => {
    await reportTestFailure(restage, testInfo);
  });

  test('Prepare Resources', async () => {
    _resources.writePath(_resources.main(), _resources.tempate() + '}');
  });

  test('Test Actions', async () => {
    await _actionsTest.init();
  });
});
