import { ReStage } from '../../../restage.js';
import { Actions } from '../../base/actions.js';
import { AssetsRun } from './assets_run.js';
import { Resources } from '../../../resources.js';
import { Rml } from '../../base/rml.js';

export class RmlTest extends Rml {
  private readonly resources: Resources;
  private readonly actions: Actions;
  declare protected readonly asserts: AssetsRun;

  constructor(restage: ReStage) {
    super(restage, new AssetsRun(restage));
    this.resources = new Resources(restage);
    this.actions = new Actions(restage);
  }

  updateCode(source: string, target: string): void {
    const context = this.resources.javaContext();
    const updated = context.replace(source, source + target);
    this.resources.writePath(this.resources.main(), updated);
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
    this.resources.deletePath(this.resources.asserts());
    await this.restage.click(schema.locator('[data-testid="rml-runner-auth"]').getByRole('button', { name: 'Node actions' }));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Properties' }));
    await this.restage.select(schema.getByLabel('Enabled'), 'disabled');
    await this.restage.click(schema.getByRole('button', { name: 'Close properties' }));
    await this.actions.runTestWithAIEngine();
  }

  async invalidStatusCode() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.getByLabel('Save To'), 'default');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Expected Value' }), '201');
    await this.add();
    await this.done();
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.invalidStatusCode(this.runTestDialog('error'));
  }

  async addCustomRule() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'Add Section' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Section Name' }), 'loginUserTest');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Tag' }), '@login');
    await this.restage.click(schema.getByLabel('Add Assertion Section').getByRole('button', { name: 'Add' }));
    await this.restage.select(schema.locator('#rmlAssertionFileAction'), 'exists');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Response Path' }), 'invalid');
    await this.add();
    await this.done();
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.invalidStatusCode(this.runTestDialog('error'), '@login');
  }

  async changeStatusCode() {
    const schema = await this.getSchema();
    await this.asserts.checkStatusCode('statusCode=201');
    await this.restage.click(schema.getByRole('button', { name: 'Open ReStage API Schema' }));
    await this.restage.click(schema.getByLabel('Settings sections').getByRole('button', { name: 'RML' }));
    await this.restage.click(schema.getByRole('button', { name: 'Save' }));
    await this.restage.click(schema.getByRole('button', { name: 'Close settings' }));
    await this.asserts.checkStatusCode('statusCode=200');
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.addCustomRule(this.runTestDialog('error'));
  }

  async statusCodeSoftAndCustomRule() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Remove');
    await schema.locator('[data-source-method="loginUser"]').waitFor({ state: 'detached' });
    await this.addNode('auth', 'POST', 'Login user');
    await this.invalidStatusCode();
    await this.addCustomRule();
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.invalidStatusCode(this.runTestDialog('error'), '@login');
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'default 1' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Expected Value' }), '201');
    await this.restage.click(schema.locator('label.rml-assertion-soft-control[for="rmlAssertionFileSoft"]')); // Hard -> Soft
    await this.add();
    await this.done();
    await this.asserts.checkStatusCode('?statusCode=201');
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.addCustomRule(this.runTestDialog('error'));
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'Edit assertion file entry' }).first());
    await this.restage.click(schema.locator('label.rml-assertion-soft-control[for="rmlAssertionFileSoft"]')); // Hard -> Soft
    await this.update();
    await this.done();
    await this.asserts.checkStatusCode('?statusCode=201');
    await this.asserts.checkLoginUserTest();
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.statusAndCustomRule(this.runTestDialog('error'));
  }

  async addInlineRule() {
    const schema = await this.getSchema();
    this.updateCode(`public void loginUser() {`, `\n\n\t\tSystem.out.println("Before Assertion");`);
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.select(schema.locator('#rmlAssertionType'), 'isEqual');
    await this.restage.click(schema.locator('#rmlAssertionPathPicker'));
    await this.restage.click(schema.getByRole('menuitem', { name: 'Response Key Select a key' }));
    await this.restage.click(schema.getByRole('button', { name: 'expiresInSeconds:' }));
    await this.restage.fill(schema.getByRole('textbox', { name: 'Expected Value' }), '1');
    await this.restage.fill(schema.getByRole('textbox', { name: 'Message' }), 'Invalid Value');
    await this.add();
    await this.done();
    this.updateCode(`// ReSTage assertions end`, `\n\n\t\tSystem.out.println("After Assertion");`);
    await this.restage.sleep();
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.inlineRule(this.runTestDialog('error'));
    await this.asserts.checkTestLog();
  }

  async addInlineRuleSoft() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'Edit inline assertion' }));
    await this.restage.click(schema.locator('.rml-assertion-soft-switch').first());
    await this.update();
    await this.done();
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.inlineRuleSoft(this.runTestDialog('error'));
    await this.asserts.checkTestLog(true);
  }

  async changeInlineRuleSoft() {
    const schema = await this.getSchema();
    await this.nodeMenu('loginUser', 'Assertions');
    await this.restage.click(schema.getByRole('button', { name: 'Edit inline assertion' }));
    await this.restage.click(schema.locator('.rml-assertion-soft-switch').first());
    await this.update();
    await this.done();
    await this.restage.click(this.restage.page.getByRole('button', { name: ' Open ReSTage suggestions' }).first());
    await this.restage.click((await this.restage.waitFrameLocator('AI Message Bot')).getByRole('button', { name: 'Apply' }));
    await this.nodeMenu('loginUser', 'Run Test');
    await this.asserts.inlineRuleSoft(this.runTestDialog('error'));
    await this.asserts.checkTestLog(true);
  }
}
