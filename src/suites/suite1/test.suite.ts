import { ReStage } from '../../restage.js';
import { Resources } from '../../resources.js';
import { Asserts } from './asserts.js';

import { WizardTest } from './tests/wizard.test.js';
import { ActionsTest } from './tests/actions.test.js';
import { SchemaTest } from './tests/schema.test.js';
import { EnvironmentTest } from './tests/environment.test.js';
import { RmlTest } from './tests/rml.test.js';

export class TestSuite1 {
  constructor(private readonly restage: ReStage) {}

  async run(): Promise<void> {
    const resources = new Resources(this.restage);
    const asserts = new Asserts(this.restage, resources);
    const wizardTest = new WizardTest(this.restage);
    const actionsTest = new ActionsTest(this.restage);
    const schemaTest = new SchemaTest(this.restage, resources);
    const environmentTest = new EnvironmentTest(this.restage);
    const rmlTest = new RmlTest(this.restage);

    await wizardTest.init();
    await asserts.validateWizardCreated();

    await actionsTest.init();
    await schemaTest.init();
    await schemaTest.changeLabel(0, 0, 'Get Auth User');
    await schemaTest.changeLabel(0, 1, 'Login user');
    await schemaTest.changeLabel(0, 2, 'Refresh token');
    await schemaTest.openOperation(0, 1);
    await schemaTest.changeVariable(0, 1, '"emilys"');
    await schemaTest.changeBody(
      0,
      1,
      '{ "username" : "{{username}}", "password" : "emilyspass", "expiresInMins" : 30 }',
      '{\n  "username" : "{{username}}",\n  "password" : "{{password}}",\n  "expiresInMins" : {{expiresInMins}}\n}',
    );

    await environmentTest.init();

    await rmlTest.init();
    await asserts.validateAddAuthFolder();
    await rmlTest.addLoginUser();
    await asserts.validateAddLoginUser();
    await rmlTest.addAuthUser();
    await asserts.validateAddAuthUser();
    await rmlTest.addRefreshToken();
    await asserts.validateAddRefreshToken();

    await actionsTest.toggleAIMesssageBot();
    await actionsTest.runTestWithAIEngine();
    await actionsTest.runMavenTest();
    await actionsTest.mavenBuildSuccess();
  }

  async deleteProject(): Promise<void> {
    const page = this.restage.page;
    this.restage.click(page.getByRole('button', { name: 'Delete the current project' }));
    await this.restage.inspect();
  }
}
