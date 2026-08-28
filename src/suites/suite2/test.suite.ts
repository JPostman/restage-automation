import { test, prepareTestContext, reportTestFailure, inspectTestClassOnComplete } from '../suites.js';
import { Asserts } from './asserts.js';
import { Resources } from '../../resources.js';
import { ActionsTest } from './tests/actions.test.js';
import { ReStage } from '../../restage.js';
import { RmlTest } from './tests/rml.test.js';

test.describe('Suite 2', () => {
  let _restage: ReStage;
  let _asserts: Asserts;
  let _resources: Resources;
  let _actionsTest: ActionsTest;
  let _rmlTest: RmlTest;

  test.beforeAll(async ({ restage }) => {
    await prepareTestContext(restage, 'suite2');
    _restage = restage;
    _asserts = new Asserts(restage);
    _resources = new Resources(restage);
    _actionsTest = new ActionsTest(restage);
    _rmlTest = new RmlTest(restage);
  });

  test.afterEach(async ({ restage }, testInfo) => {
    await reportTestFailure(restage, testInfo);
  });

  test.afterAll(async ({ restage }, testInfo) => {
    await inspectTestClassOnComplete(restage, testInfo);
  });

  test('Test RML', async () => {
    await _actionsTest.init();
    await _rmlTest.init();
    await _asserts.validateAddAuthFolder();
    await _rmlTest.addLoginUser();
    await _asserts.validateAddLoginCache();
    await _rmlTest.addAuthUser();
    await _asserts.validateAddAuthUser();
    await _rmlTest.createRequestToken();
    await _asserts.validateAddLoginUser();
    await _rmlTest.addUserDependencies();
    await _asserts.validateUserDependencies();
    await _rmlTest.addRefreshToken();
    await _asserts.validateAddRefreshToken();
    await _rmlTest.addRefreshDependencies();
    await _asserts.validateRefreshDependencies();
    await _rmlTest.addRefreshBody();
    await _asserts.validateAddRefreshBody();
    await _rmlTest.preview();
  });

  test('Test AI Engine', async () => {
    await _actionsTest.toggleAIMesssageBot();
    await _actionsTest.runTestWithAIEngine();
  });

  test('Test Maven Build', async () => {
    await _actionsTest.runMavenTest();
    await _actionsTest.mavenBuildSuccess();
  });
});
