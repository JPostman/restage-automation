import { ReStage } from '../../../restage.js';
import { Actions } from '../../base/actions.js';
import { Resources } from '../../../resources.js';
import { Rml } from '../../base/rml.js';

export class RmlTest extends Rml {
  private readonly resources: Resources;
  private readonly actions: Actions;

  constructor(restage: ReStage) {
    super(restage);
    this.resources = new Resources(restage);
    this.actions = new Actions(restage);
  }

  async applyAndDone(add: boolean = true): Promise<void> {
    await (add ? this.add() : this.update());
    await this.done();
  }

  async init(): Promise<void> {
    await this.openRmlTab();
    await this.wrapLine();
    await this.dragAndDropFolder('auth');
    await this.collapseFolders();
    await this.addNode('auth', 'POST', 'Login user');
  }

  async disableRunner(): Promise<void> {
    const schema = await this.getSchema();
    await this.restage.click(schema.getByTestId('rml-runner-auth').getByRole('button', { name: 'Node actions' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Properties' }));
    await this.restage.select(schema.getByLabel('Enabled'), 'disabled');
    await this.restage.click(schema.getByRole('button', { name: 'Close properties' }));
    await this.actions.runTestWithAIEngine();
  }

  async addAssertionsPath() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'exists');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'Run Test' }));
    await this.restage.defaultTestMenu();
    await this.restage.click(schema.getByRole('button', { name: /accessToken.*/ }));
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionType'), 'pathEquals');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /accessToken.*/ }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Expected Value' }), '********');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Invalid access token');
    await this.applyAndDone();
  }

  async updatePathUsername() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'Edit inline assertion' }).nth(1));
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /username.*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Response Key, Class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: /{{username}}.*/ }));
    await this.applyAndDone(false);
  }

  async addIsEqual() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isEqual');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /firstName.*/ }));
    await this.restage.click(schema.getByRole('textbox', { name: 'Expected Value' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Expected Value' }), 'ReStage');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Compare Firstname');
    await this.applyAndDone();
  }

  async addIsTrue() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isTrue');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'secure: true' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Server is secure');
    await this.applyAndDone();
  }

  async addIsFalse() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isFalse');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'secure: false' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Server is unsecure');
    await this.applyAndDone();
  }

  async addIsNull() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isNull');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'host: null' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Local host is null');
    await this.applyAndDone();
  }

  async addNotCondition() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'notExists');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Response Path' }), '/helloworld');
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionType'), 'pathNotNull');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'host: "localhost:8080"' }));
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isNotNull');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'host: "localhost:8080"' }));
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isNotEqual');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Actual Value' }), 'true');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Expected Value' }), 'false');
    await this.add();
    await this.done();
  }

  async addAllMatch() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'allMatchIndexed');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'active: true' }).first());
    await this.restage.click(schema.getByRole('menuitem', { name: /Create New Function.*/ }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Function Name' }), 'validateServerIsActive');
    await this.restage.click(schema.getByRole('button', { name: 'Show standard Java types' }));
    await this.restage.click(schema.getByRole('option', { name: 'Boolean' }));
    await this.restage.click(schema.getByLabel('Validation Function').getByRole('button', { name: 'Add' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Assertion Value' }), '/servers/[*]/active,Boolean,::validateServerIsActive');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Is Active');
    await this.applyAndDone();
  }

  async addAnyMatch() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'anyMatchIndexed');
    await this.restage.click(schema.getByRole('button', { name: 'Select a Response Key' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'name: "local"' }).first());
    await this.restage.click(schema.getByRole('menuitem', { name: /Create New Function.*/ }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Function Name' }), 'validateServerIsLocal');
    await this.restage.click(schema.getByRole('button', { name: 'Show standard Java types' }));
    await this.restage.click(schema.getByRole('option', { name: 'String' }));
    await this.restage.click(schema.getByLabel('Validation Function').getByRole('button', { name: 'Add' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Assertion Value' }), '/servers/[*]/name,String,::validateServerIsLocal');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Is Local');
    await this.applyAndDone();
    this.resources.update(
      this.resources.main(),
      `public boolean validateServerIsLocal(String value, int index) {
		return true;
	}`,
      `public boolean validateServerIsLocal(String value, int index) {
		return "local".equals(value);
	}`,
    );
  }
}
