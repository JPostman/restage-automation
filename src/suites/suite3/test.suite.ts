import { test, prepareTestContext, reportTestFailure, inspectTestClassOnComplete } from '../suites.js';
import { Actions } from '../base/actions.js';
import { ReStage } from '../../restage.js';
import { Asserts } from './tests/asserts.js';
import { RmlTest } from './tests/rml.test.js';

test.describe('Suite 3', () => {
  let _restage: ReStage;
  let _asserts: Asserts;
  let _actions: Actions;
  let _rmlTest: RmlTest;

  test.beforeAll(async ({ restage }) => {
    await prepareTestContext(restage, 'suite3');
    _restage = restage;
    _asserts = new Asserts(restage);
    _actions = new Actions(restage);
    _rmlTest = new RmlTest(restage);
  });

  test.afterEach(async ({ restage }, testInfo) => {
    await reportTestFailure(restage, testInfo);
  });

  test.afterAll(async ({ restage }, testInfo) => {
    await inspectTestClassOnComplete(restage, testInfo);
  });

  test('Test RML', async () => {
    await _actions.open();
    await _rmlTest.init();
    await _asserts.validateAddAuthFolder();
    await _rmlTest.addLoginUser();
    await _asserts.validateUpdateLoginUser();
    await _rmlTest.varsLoginUser();
    await _asserts.validateVarsLoginUser();
    await _rmlTest.addAuthUser();
    await _asserts.validateAddAuthUser();
  });

  test('Test AI Engine', async () => {
    await _actions.toggleAIMesssageBot();
    await _actions.runTestWithAIEngine();
  });

  test('Test Maven Build', async () => {
    await _actions.runMavenTest();
    await _actions.mavenBuildSuccess();
  });
});
