import { test, prepareTestContext, reportTestFailure, inspectTestClassOnComplete } from '../suites.js';
import { Asserts } from './tests/asserts.js';
import { WizardTest } from './tests/wizard.test.js';
import { ActionsTest } from './tests/actions.test.js';
import { SchemaTest } from './tests/schema.test.js';
import { EnvironmentTest } from './tests/environment.test.js';
import { RmlTest } from './tests/rml.test.js';
import { SettingsTest } from './tests/settings.js';
import { ReStage } from '../../restage.js';

test.describe('Suite 1', () => {
  let _restage: ReStage;
  let _asserts: Asserts;
  let _wizardTest: WizardTest;
  let _actionsTest: ActionsTest;
  let _schemaTest: SchemaTest;
  let _environmentTest: EnvironmentTest;
  let _rmlTest: RmlTest;
  let _settings: SettingsTest;

  test.beforeAll(async ({ restage }) => {
    await prepareTestContext(restage, 'suite1');

    _restage = restage;
    _asserts = new Asserts(restage);
    _wizardTest = new WizardTest(restage);
    _actionsTest = new ActionsTest(restage);
    _schemaTest = new SchemaTest(restage);
    _environmentTest = new EnvironmentTest(restage);
    _rmlTest = new RmlTest(restage);
    _settings = new SettingsTest(restage);
  });

  test.afterEach(async ({ restage }, testInfo) => {
    await reportTestFailure(restage, testInfo);
  });

  test.afterAll(async ({ restage }, testInfo) => {
    await inspectTestClassOnComplete(restage, testInfo);
  });

  test('Test Wizard', async () => {
    await _wizardTest.init();
  });

  test('Test Settings', async () => {
    await _settings.init();
    await _restage.sleep();
    await _asserts.validateWizardCreated();
  });

  test('Test Actions', async () => {
    await _actionsTest.init();
  });

  test('Test Schema Tab', async () => {
    await _schemaTest.init();
    await _schemaTest.changeLabel(0, 0, 'Get Auth User');
    await _schemaTest.changeLabel(0, 1, 'Login user');
    await _schemaTest.changeLabel(0, 2, 'Refresh token');
    await _schemaTest.openOperation(0, 1);
    await _schemaTest.changeVariable(0, 1, '"emilys"');
    await _schemaTest.changeBody(
      0,
      1,
      '{ "username" : "{{username}}", "password" : "emilyspass", "expiresInMins" : 30 }',
      '{\n  "username" : "{{username}}",\n  "password" : "{{password}}",\n  "expiresInMins" : {{expiresInMins}}\n}',
    );
  });

  test('Test Environment Tab', async () => {
    await _environmentTest.init();
  });

  test('Test RML Tab', async () => {
    await _rmlTest.init();
    await _asserts.validateAddAuthFolder();
    await _rmlTest.addLoginUser();
    await _asserts.validateAddLoginCache();
    await _rmlTest.createRequestToken();
    await _asserts.validateCreateSetToken();
    await _rmlTest.setRequestToken();
    await _asserts.validateSetToken();
    await _rmlTest.addAuthUser();
    await _asserts.validateAddAuthUser();
    await _rmlTest.addRefreshToken();
    await _asserts.validateAddRefreshToken();
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
