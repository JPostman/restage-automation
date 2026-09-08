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

  async init(): Promise<void> {
    this.resources.deletePath(this.resources.asserts());
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

  async addRules() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'Add Section' }));
    await this.restage.click(schema.getByLabel('Add Assertion Section').getByRole('button', { name: 'Add' }));
    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'exists');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'Run Test' }));
    await this.restage.defaultTestMenu();
    await this.restage.click(schema.getByRole('button', { name: /accessToken.*/ }));
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'pathEquals');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /username.*/ }));
    await this.restage.click(schema.getByRole('button', { name: 'Select Response Key, Class' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Environments' }));
    await this.restage.click(schema.getByRole('menuitem', { name: /{{username}}.*/ }));
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Invalid access token'); // Message
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'isEqual');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: /firstName.*/ }));
    await this.restage.fill(schema.locator('#rmlAssertionFileExpected'), 'ReStage');
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Compare Firstname');
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'isTrue');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'secure: true' }));
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Server is secure');
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'isFalse');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'secure: false' }));
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Server is unsecure');
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'isNull');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'host: null' }));
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Local host is null');
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'notExists');
    await this.restage.fill(schema.locator('#rmlAssertionFileValue'), '/helloworld');
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'pathNotNull');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'host: "localhost:8080"' }));
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'isNotNull');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'host: "localhost:8080"' }));
    await this.add();
    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'isNotEqual');
    await this.restage.fill(schema.locator('#rmlAssertionFileValue'), 'true');
    await this.restage.fill(schema.locator('#rmlAssertionFileExpected'), 'false');
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'allMatch');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'active: true' }).first());
    await this.restage.click(schema.getByRole('menuitem', { name: /Create New Function.*/ }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Function Name' }), 'validateServerIsActive');
    await this.restage.click(schema.getByRole('button', { name: 'Show standard Java types' }));
    await this.restage.click(schema.getByRole('option', { name: 'Boolean' }));
    await this.restage.click(schema.getByLabel('Validation Function').getByRole('button', { name: 'Add' }));
    await this.restage.fill(schema.locator('#rmlAssertionFileValue'), '/servers/[*]/active,Boolean,::validateServerIsActive');
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Is Active');
    await this.add();

    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'anyMatch');
    await this.restage.click(schema.locator('#rmlAssertionFileValuePicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'name: "local"' }).first());
    await this.restage.click(schema.getByRole('menuitem', { name: /Create New Function.*/ }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Function Name' }), 'validateServerIsLocal');
    await this.restage.click(schema.getByRole('button', { name: 'Show standard Java types' }));
    await this.restage.click(schema.getByRole('option', { name: 'String' }));
    await this.restage.click(schema.getByLabel('Validation Function').getByRole('button', { name: 'Add' }));
    await this.restage.fill(schema.locator('#rmlAssertionFileValue'), '/servers/[*]/name,String,::validateServerIsLocal');
    await this.restage.fill(schema.locator('#rmlAssertionFileMessage'), 'Is Local');
    await this.add();
    await this.done();
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
